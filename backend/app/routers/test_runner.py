"""
test_runner.py — Run test cases from test_cases.json programmatically.

Bypasses document upload: creates claims with structured data directly
and runs the adjudication engine to compare actual vs expected output.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.models.claim import Claim, Member, Document, Decision
from app.services.adjudication_engine import adjudicate_claim
from datetime import datetime, timedelta
import json
import uuid
from pathlib import Path

router = APIRouter()

# Load test cases from data/test_cases.json
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_TEST_CASES_FILE = _PROJECT_ROOT / "data" / "test_cases.json"
_FALLBACK = _PROJECT_ROOT / "test_cases.json"


def _load_test_cases() -> list[dict]:
    for path in [_TEST_CASES_FILE, _FALLBACK]:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("test_cases", [])
    return []


def _compare_decisions(actual: dict, expected: dict) -> dict:
    """Compare actual decision with expected output and return a result."""
    passed = True
    details = []

    # Check decision type
    exp_decision = expected.get("decision", "").upper()
    act_decision = actual.get("decision", "").upper()
    if exp_decision != act_decision:
        passed = False
        details.append(f"Decision: expected '{exp_decision}', got '{act_decision}'")

    # Check approved amount (with tolerance)
    if "approved_amount" in expected:
        exp_amt = float(expected["approved_amount"])
        act_amt = float(actual.get("approved_amount", 0))
        # Allow 15% tolerance since LLM confidence can shift amounts slightly
        tolerance = max(exp_amt * 0.15, 200)
        if abs(exp_amt - act_amt) > tolerance:
            passed = False
            details.append(f"Approved amount: expected Rs.{exp_amt:.0f}, got Rs.{act_amt:.0f}")

    # Check rejection reasons (if expected has them)
    if "rejection_reasons" in expected:
        exp_reasons = set(expected["rejection_reasons"])
        act_reasons = set(actual.get("rejection_reasons", []))
        if not exp_reasons.issubset(act_reasons):
            missing = exp_reasons - act_reasons
            passed = False
            details.append(f"Missing rejection reasons: {missing}")

    return {
        "passed": passed,
        "details": details if details else ["All checks passed"],
    }


# ─────────────────────────────────────────────
# POST /api/test/run-all
# ─────────────────────────────────────────────

@router.post("/run-all")
async def run_all_test_cases(db: AsyncSession = Depends(get_db)):
    """Run all 10 test cases and return pass/fail results."""
    test_cases = _load_test_cases()
    if not test_cases:
        raise HTTPException(status_code=404, detail="test_cases.json not found")

    results = []
    passed_count = 0

    for tc in test_cases:
        result = await _run_single_test(tc, db)
        results.append(result)
        if result["comparison"]["passed"]:
            passed_count += 1

    return {
        "total": len(test_cases),
        "passed": passed_count,
        "failed": len(test_cases) - passed_count,
        "pass_rate": f"{(passed_count / len(test_cases) * 100):.0f}%",
        "results": results,
    }


# ─────────────────────────────────────────────
# POST /api/test/run/{case_id}
# ─────────────────────────────────────────────

@router.post("/run/{case_id}")
async def run_single_test_case(case_id: str, db: AsyncSession = Depends(get_db)):
    """Run a single test case by ID (e.g. TC001)."""
    test_cases = _load_test_cases()
    tc = next((t for t in test_cases if t["case_id"] == case_id.upper()), None)
    if not tc:
        raise HTTPException(status_code=404, detail=f"Test case {case_id} not found")

    return await _run_single_test(tc, db)


# ─────────────────────────────────────────────
# Internal: run one test case
# ─────────────────────────────────────────────

async def _run_single_test(tc: dict, db: AsyncSession) -> dict:
    """Create a synthetic claim from test data, adjudicate, and compare."""
    input_data = tc["input_data"]
    expected = tc["expected_output"]

    member_id = input_data["member_id"]
    claim_id = f"TEST_{tc['case_id']}_{uuid.uuid4().hex[:4].upper()}"

    # Clean up any prior test claims for this member
    # (to avoid fraud detection false positives across test runs)
    await db.execute(
        delete(Decision).where(
            Decision.claim_id.like(f"TEST_{tc['case_id']}_%")
        )
    )
    await db.execute(
        delete(Document).where(
            Document.claim_id.like(f"TEST_{tc['case_id']}_%")
        )
    )
    await db.execute(
        delete(Claim).where(
            Claim.claim_id.like(f"TEST_{tc['case_id']}_%")
        )
    )
    # Also clean up fake fraud claims from this test case
    await db.execute(
        delete(Decision).where(
            Decision.claim_id.like(f"FAKE_{tc['case_id']}_%")
        )
    )
    await db.execute(
        delete(Claim).where(
            Claim.claim_id.like(f"FAKE_{tc['case_id']}_%")
        )
    )
    await db.flush()

    # Ensure member exists
    result = await db.execute(
        select(Member).where(Member.member_id == member_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        return {
            "case_id": tc["case_id"],
            "case_name": tc["case_name"],
            "status": "ERROR",
            "error": f"Member {member_id} not found. Run seed first.",
            "comparison": {"passed": False, "details": ["Member not found"]},
        }

    # Reset member's claims_ytd for clean test
    member.claims_ytd = 0.0
    if "member_join_date" in input_data:
        member.join_date = input_data["member_join_date"]

    # Create the claim
    diagnosis = ""
    docs_data = input_data.get("documents", {})

    # Extract diagnosis from prescription data
    if "prescription" in docs_data:
        diagnosis = docs_data["prescription"].get("diagnosis", "")

    # Set submission_date to 1 day after treatment (not today's date)
    # to avoid false LATE_SUBMISSION on test data from past years
    treatment_dt = datetime.strptime(input_data["treatment_date"], "%Y-%m-%d")
    submission_dt = (treatment_dt + timedelta(days=1)).strftime("%Y-%m-%d")

    claim = Claim(
        claim_id=claim_id,
        member_id=member_id,
        treatment_date=input_data["treatment_date"],
        submission_date=submission_dt,
        claim_amount=input_data["claim_amount"],
        hospital_name=input_data.get("hospital", ""),
        diagnosis=diagnosis,
        status="PENDING",
    )
    db.add(claim)
    await db.flush()

    # Create synthetic documents from test data
    if "prescription" in docs_data:
        presc = docs_data["prescription"]
        fields = {
            "doc_type": "prescription",
            "doctor_name": presc.get("doctor_name", ""),
            "doctor_registration_number": presc.get("doctor_reg", ""),
            "diagnosis": presc.get("diagnosis", ""),
            "patient_name": input_data.get("member_name", ""),
            "date": input_data["treatment_date"],
            "medicines_prescribed": presc.get("medicines_prescribed", []),
            "tests_advised": presc.get("tests_prescribed", []),
            "is_legible": True,
            "missing_fields": [],
        }
        doc = Document(
            claim_id=claim_id,
            doc_type="prescription",
            file_name=f"test_prescription_{tc['case_id']}.pdf",
            file_path="test",
            extracted_text=json.dumps(presc),
            extracted_fields=json.dumps(fields),
            is_valid=True,
            validation_notes=json.dumps([]),
        )
        db.add(doc)

    if "bill" in docs_data:
        bill = docs_data["bill"]
        # Build items list from bill data
        items = []
        for key, val in bill.items():
            if isinstance(val, (int, float)):
                desc = key.replace("_", " ").title()
                items.append({"description": desc, "amount": val})
        fields = {
            "doc_type": "bill",
            "hospital_name": input_data.get("hospital", ""),
            "date": input_data["treatment_date"],
            "patient_name": input_data.get("member_name", ""),
            "items": items,
            "total_amount": input_data["claim_amount"],
            "is_legible": True,
            "missing_fields": [],
        }
        doc = Document(
            claim_id=claim_id,
            doc_type="bill",
            file_name=f"test_bill_{tc['case_id']}.pdf",
            file_path="test",
            extracted_text=json.dumps(bill),
            extracted_fields=json.dumps(fields),
            is_valid=True,
            validation_notes=json.dumps([]),
        )
        db.add(doc)

    await db.flush()

    # Simulate previous_claims_same_day for fraud detection (TC008)
    if input_data.get("previous_claims_same_day", 0) > 0:
        for i in range(input_data["previous_claims_same_day"]):
            fake_claim = Claim(
                claim_id=f"FAKE_{tc['case_id']}_{i}_{uuid.uuid4().hex[:4]}",
                member_id=member_id,
                treatment_date=input_data["treatment_date"],
                submission_date=submission_dt,
                claim_amount=1000,
                status="APPROVED",
            )
            db.add(fake_claim)
        await db.flush()

    # Run adjudication
    try:
        decision = await adjudicate_claim(claim, db)

        actual = {
            "decision": decision.decision,
            "approved_amount": decision.approved_amount,
            "rejection_reasons": json.loads(decision.rejection_reasons or "[]"),
            "confidence_score": decision.confidence_score,
            "notes": decision.notes,
            "next_steps": decision.next_steps,
            "flags": json.loads(decision.flags or "[]"),
        }

        comparison = _compare_decisions(actual, expected)

        return {
            "case_id": tc["case_id"],
            "case_name": tc["case_name"],
            "description": tc.get("description", ""),
            "status": "PASS" if comparison["passed"] else "FAIL",
            "expected": expected,
            "actual": actual,
            "comparison": comparison,
        }

    except Exception as e:
        return {
            "case_id": tc["case_id"],
            "case_name": tc["case_name"],
            "status": "ERROR",
            "error": str(e),
            "comparison": {"passed": False, "details": [str(e)]},
        }
