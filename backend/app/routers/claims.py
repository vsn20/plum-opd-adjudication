"""
claims.py — API router for claim submission, adjudication, and status retrieval
"""

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.claim import Claim, Member, Document, Decision
from app.services.document_processor import process_document
from app.services.adjudication_engine import adjudicate_claim
from datetime import datetime
import json
import os
import shutil
import uuid

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ─────────────────────────────────────────────
# POST /api/claims/submit
# ─────────────────────────────────────────────

@router.post("/submit")
async def submit_claim(
    member_id: str = Form(...),
    treatment_date: str = Form(...),
    claim_amount: float = Form(...),
    hospital_name: str = Form(""),
    cashless_request: bool = Form(False),
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Accepts a multipart form with:
      - member_id, treatment_date, claim_amount, hospital_name
      - One or more document files (images or PDFs)

    Processes documents, runs full adjudication, and returns the decision.
    """

    # 1. Validate member exists
    result = await db.execute(
        select(Member).where(Member.member_id == member_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail=f"Member {member_id} not found. Please seed members first via POST /api/members/seed")

    # 2. Create claim record
    claim_id = f"CLM_{uuid.uuid4().hex[:5].upper()}"
    claim = Claim(
        claim_id=claim_id,
        member_id=member_id,
        treatment_date=treatment_date,
        submission_date=datetime.utcnow().strftime("%Y-%m-%d"),
        claim_amount=claim_amount,
        hospital_name=hospital_name,
        status="PROCESSING",
    )
    db.add(claim)
    await db.flush()  # get the ID without full commit

    # 3. Save files and process each document
    processed_docs = []
    claim_dir = os.path.join(UPLOAD_DIR, claim_id)
    os.makedirs(claim_dir, exist_ok=True)

    for uploaded_file in files:
        # Save to disk
        file_path = os.path.join(claim_dir, uploaded_file.filename)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(uploaded_file.file, f)

        # Run Claude Vision processing
        try:
            result_data = await process_document(file_path)
        except Exception as e:
            result_data = {
                "extracted_text": "",
                "fields": {},
                "doc_type": "unknown",
                "is_legible": False,
                "missing_fields": [str(e)],
            }

        # Determine doc type from extracted fields
        doc_type = result_data.get("doc_type", "unknown")

        # Save document record
        doc = Document(
            claim_id=claim_id,
            doc_type=doc_type,
            file_name=uploaded_file.filename,
            file_path=file_path,
            extracted_text=result_data.get("extracted_text", ""),
            extracted_fields=json.dumps(result_data.get("fields", {})),
            is_valid=result_data.get("is_legible", True),
            validation_notes=json.dumps(result_data.get("missing_fields", [])),
        )
        db.add(doc)

        # Attach diagnosis to claim if from prescription
        if doc_type == "prescription":
            fields = result_data.get("fields", {})
            claim.diagnosis = fields.get("diagnosis", "")

        processed_docs.append({
            "file_name": uploaded_file.filename,
            "doc_type": doc_type,
            "is_legible": result_data.get("is_legible", True),
            "missing_fields": result_data.get("missing_fields", []),
            "fields": result_data.get("fields", {}),
        })

    # 4. Set status to PENDING before adjudication
    claim.status = "PENDING"
    await db.flush()

    # 5. Run adjudication engine
    decision = await adjudicate_claim(claim, db)

    # 6. Build decision response
    decision_data = {
        "decision": decision.decision,
        "approved_amount": decision.approved_amount,
        "rejection_reasons": json.loads(decision.rejection_reasons or "[]"),
        "confidence_score": decision.confidence_score,
        "notes": decision.notes,
        "next_steps": decision.next_steps,
        "flags": json.loads(decision.flags or "[]"),
    }

    return {
        "claim_id": claim_id,
        "member_id": member_id,
        "status": claim.status,
        "message": f"Claim {decision.decision}.",
        "documents_processed": len(processed_docs),
        "documents": processed_docs,
        "decision": decision_data,
    }


# ─────────────────────────────────────────────
# GET /api/claims/ — list all claims
# ─────────────────────────────────────────────

@router.get("/")
async def list_claims(db: AsyncSession = Depends(get_db)):
    """Fetch all claims with their decisions, ordered by most recent first."""
    result = await db.execute(
        select(Claim).order_by(Claim.created_at.desc())
    )
    claims = result.scalars().all()

    response = []
    for c in claims:
        decision_data = None
        if c.decision:
            d = c.decision
            decision_data = {
                "decision": d.decision,
                "approved_amount": d.approved_amount,
                "rejection_reasons": json.loads(d.rejection_reasons or "[]"),
                "confidence_score": d.confidence_score,
                "notes": d.notes,
                "next_steps": d.next_steps,
                "flags": json.loads(d.flags or "[]"),
            }

        response.append({
            "claim_id": c.claim_id,
            "member_id": c.member_id,
            "treatment_date": c.treatment_date,
            "submission_date": c.submission_date,
            "claim_amount": c.claim_amount,
            "hospital_name": c.hospital_name,
            "diagnosis": c.diagnosis,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "decision": decision_data,
        })

    return response


# ─────────────────────────────────────────────
# GET /api/claims/{claim_id}
# ─────────────────────────────────────────────

@router.get("/{claim_id}")
async def get_claim(claim_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch a single claim with its decision."""
    result = await db.execute(
        select(Claim).where(Claim.claim_id == claim_id)
    )
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    decision_data = None
    if claim.decision:
        d = claim.decision
        decision_data = {
            "decision": d.decision,
            "approved_amount": d.approved_amount,
            "rejection_reasons": json.loads(d.rejection_reasons or "[]"),
            "confidence_score": d.confidence_score,
            "notes": d.notes,
            "next_steps": d.next_steps,
            "flags": json.loads(d.flags or "[]"),
        }

    return {
        "claim_id": claim.claim_id,
        "member_id": claim.member_id,
        "treatment_date": claim.treatment_date,
        "claim_amount": claim.claim_amount,
        "status": claim.status,
        "diagnosis": claim.diagnosis,
        "hospital_name": claim.hospital_name,
        "decision": decision_data,
    }


# ─────────────────────────────────────────────
# GET /api/claims/member/{member_id}
# ─────────────────────────────────────────────

@router.get("/member/{member_id}")
async def get_member_claims(member_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch all claims for a member."""
    result = await db.execute(
        select(Claim).where(Claim.member_id == member_id).order_by(Claim.created_at.desc())
    )
    claims = result.scalars().all()
    return [
        {
            "claim_id": c.claim_id,
            "treatment_date": c.treatment_date,
            "claim_amount": c.claim_amount,
            "status": c.status,
            "diagnosis": c.diagnosis,
        }
        for c in claims
    ]