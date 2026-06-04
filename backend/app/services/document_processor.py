"""
document_processor.py
---------------------
Uses Claude Vision API to:
  1. Extract raw text from uploaded medical document images/PDFs
  2. Parse that text into structured JSON fields

FIXES vs original:
  - Uses anthropic.AsyncAnthropic (not Anthropic) so await works correctly
  - Updated model to claude-sonnet-4-20250514
"""

import anthropic
import base64
import json
import re
import os
from pathlib import Path

# ✅ AsyncAnthropic — required for use inside FastAPI async routes
client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _file_to_base64(file_path: str) -> tuple[str, str]:
    """
    Read a file from disk and return (base64_data, media_type).
    Supports: jpg, jpeg, png, gif, webp, pdf
    """
    path = Path(file_path)
    ext = path.suffix.lower()

    media_type_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
    }

    media_type = media_type_map.get(ext, "image/jpeg")

    with open(file_path, "rb") as f:
        data = base64.standard_b64encode(f.read()).decode("utf-8")

    return data, media_type


def _clean_json(raw: str) -> dict:
    """Strip markdown fences and parse JSON from LLM response."""
    cleaned = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"parse_error": True, "raw": cleaned}


# ─────────────────────────────────────────────
# Step 1 — Raw OCR / text extraction
# ─────────────────────────────────────────────

EXTRACTION_PROMPT = """You are a medical document OCR system.
Carefully read this medical document image and extract ALL visible text exactly as it appears.
Preserve the structure — use line breaks, indentation, and labels as shown.
Do NOT interpret or summarize — just transcribe everything you can read.
If any part is illegible, write [ILLEGIBLE] in that spot."""


async def extract_text_from_document(file_path: str) -> str:
    """
    Send a document image to Claude Vision and get back raw extracted text.
    Returns the extracted text string.
    """
    b64_data, media_type = _file_to_base64(file_path)

    # PDFs are sent as documents; images as image blocks
    if media_type == "application/pdf":
        content = [
            {
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": b64_data,
                },
            },
            {"type": "text", "text": EXTRACTION_PROMPT},
        ]
    else:
        content = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": b64_data,
                },
            },
            {"type": "text", "text": EXTRACTION_PROMPT},
        ]

    # ✅ await works because client is AsyncAnthropic
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": content}],
    )

    return response.content[0].text


# ─────────────────────────────────────────────
# Step 2 — Structured field parsing
# ─────────────────────────────────────────────

PARSE_PROMPT_TEMPLATE = """You are a medical data extraction assistant for an insurance claims system.

Given the extracted text from a medical document below, identify the document type and extract all relevant fields as a JSON object.

DOCUMENT TEXT:
{extracted_text}

Return ONLY a valid JSON object (no markdown, no explanation) with this structure:

For a PRESCRIPTION:
{{
  "doc_type": "prescription",
  "doctor_name": "",
  "doctor_registration_number": "",
  "clinic_name": "",
  "clinic_address": "",
  "date": "",
  "patient_name": "",
  "patient_age": "",
  "patient_gender": "",
  "diagnosis": "",
  "medicines_prescribed": [],
  "tests_advised": [],
  "follow_up_date": "",
  "is_legible": true,
  "missing_fields": []
}}

For a MEDICAL BILL / INVOICE:
{{
  "doc_type": "bill",
  "hospital_name": "",
  "bill_number": "",
  "date": "",
  "patient_name": "",
  "items": [
    {{"description": "", "amount": 0}}
  ],
  "subtotal": 0,
  "gst": 0,
  "total_amount": 0,
  "payment_mode": "",
  "doctor_name": "",
  "is_legible": true,
  "missing_fields": []
}}

For a DIAGNOSTIC / LAB REPORT:
{{
  "doc_type": "lab_report",
  "lab_name": "",
  "report_id": "",
  "date": "",
  "patient_name": "",
  "referring_doctor": "",
  "tests": [
    {{"test_name": "", "result": "", "normal_range": "", "unit": ""}}
  ],
  "pathologist_name": "",
  "is_legible": true,
  "missing_fields": []
}}

For a PHARMACY BILL:
{{
  "doc_type": "pharmacy_bill",
  "pharmacy_name": "",
  "drug_license_number": "",
  "date": "",
  "patient_name": "",
  "doctor_name": "",
  "medicines": [
    {{"name": "", "quantity": 0, "mrp": 0, "amount": 0}}
  ],
  "total_amount": 0,
  "is_legible": true,
  "missing_fields": []
}}

Respond with ONLY the JSON. Do not include any text before or after."""


async def parse_document_fields(extracted_text: str) -> dict:
    """
    Takes raw extracted text and returns a structured dict of fields.
    """
    prompt = PARSE_PROMPT_TEMPLATE.format(extracted_text=extracted_text)

    # ✅ await works because client is AsyncAnthropic
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text
    return _clean_json(raw)


# ─────────────────────────────────────────────
# Main entry point — process one document
# ─────────────────────────────────────────────

async def process_document(file_path: str) -> dict:
    """
    Full pipeline for one document:
      1. Extract raw text via Claude Vision
      2. Parse into structured fields
      3. Return combined result

    Returns:
    {
        "extracted_text": "...",
        "fields": { ...structured fields... },
        "doc_type": "prescription" | "bill" | "lab_report" | "pharmacy_bill",
        "is_legible": True/False,
        "missing_fields": [...]
    }
    """
    # Step 1 — OCR
    extracted_text = await extract_text_from_document(file_path)

    # Step 2 — Parse fields
    fields = await parse_document_fields(extracted_text)

    return {
        "extracted_text": extracted_text,
        "fields": fields,
        "doc_type": fields.get("doc_type", "unknown"),
        "is_legible": fields.get("is_legible", True),
        "missing_fields": fields.get("missing_fields", []),
    }


# ─────────────────────────────────────────────
# Validation helpers used by adjudication engine
# ─────────────────────────────────────────────

VALID_REG_PATTERN = re.compile(
    r"^(AYUR/)?[A-Z]{2,3}/\d{4,6}/\d{4}$", re.IGNORECASE
)


def validate_doctor_registration(reg_number: str) -> bool:
    """
    Valid formats:
      - Standard: KA/12345/2015
      - Ayurveda: AYUR/KL/2345/2019
    """
    if not reg_number:
        return False
    return bool(VALID_REG_PATTERN.match(reg_number.strip()))


def check_date_consistency(dates: list[str]) -> bool:
    """
    All non-empty dates in the list must match (same treatment date across docs).
    """
    unique = set(d.strip() for d in dates if d)
    return len(unique) <= 1


def check_patient_name_match(name_from_doc: str, name_from_policy: str) -> bool:
    """
    Minor variations acceptable — compare lowercased first tokens.
    """
    if not name_from_doc or not name_from_policy:
        return False
    doc_parts = name_from_doc.lower().split()
    policy_parts = name_from_policy.lower().split()
    # Match if at least first name matches
    return doc_parts[0] == policy_parts[0]