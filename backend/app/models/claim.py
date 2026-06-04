from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import uuid

def generate_id():
    return str(uuid.uuid4())[:8].upper()


class Member(Base):
    __tablename__ = "members"

    id = Column(String, primary_key=True, default=generate_id)
    member_id = Column(String, unique=True, nullable=False)   # e.g. EMP001
    name = Column(String, nullable=False)
    date_of_birth = Column(String)
    gender = Column(String)
    policy_id = Column(String, default="PLUM_OPD_2024")
    policy_status = Column(String, default="active")          # active / inactive
    join_date = Column(String)                                 # YYYY-MM-DD
    annual_limit = Column(Float, default=50000.0)
    claims_ytd = Column(Float, default=0.0)                   # amount claimed this year
    created_at = Column(DateTime, default=datetime.utcnow)

    claims = relationship("Claim", back_populates="member")


class Claim(Base):
    __tablename__ = "claims"

    id = Column(String, primary_key=True, default=generate_id)
    claim_id = Column(String, unique=True)                    # CLM_XXXXX
    member_id = Column(String, ForeignKey("members.member_id"))
    treatment_date = Column(String)                           # YYYY-MM-DD
    submission_date = Column(String)
    claim_amount = Column(Float, nullable=False)
    hospital_name = Column(String)
    diagnosis = Column(String)
    status = Column(String, default="PENDING")                # PENDING / APPROVED / REJECTED / PARTIAL / MANUAL_REVIEW
    created_at = Column(DateTime, default=datetime.utcnow)

    member = relationship("Member", back_populates="claims")
    documents = relationship("Document", back_populates="claim")
    decision = relationship("Decision", back_populates="claim", uselist=False)


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_id)
    claim_id = Column(String, ForeignKey("claims.claim_id"))
    doc_type = Column(String)                # prescription / bill / lab_report / pharmacy_bill
    file_name = Column(String)
    file_path = Column(String)
    extracted_text = Column(Text)            # raw OCR text from Claude
    extracted_fields = Column(Text)          # JSON string of structured fields
    is_valid = Column(Boolean, default=True)
    validation_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    claim = relationship("Claim", back_populates="documents")


class Decision(Base):
    __tablename__ = "decisions"

    id = Column(String, primary_key=True, default=generate_id)
    claim_id = Column(String, ForeignKey("claims.claim_id"), unique=True)
    decision = Column(String)                # APPROVED / REJECTED / PARTIAL / MANUAL_REVIEW
    approved_amount = Column(Float, default=0.0)
    rejection_reasons = Column(Text)         # JSON list
    confidence_score = Column(Float)
    notes = Column(Text)
    next_steps = Column(Text)
    flags = Column(Text)                     # JSON list of fraud flags
    raw_llm_response = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    claim = relationship("Claim", back_populates="decision")