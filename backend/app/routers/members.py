"""
members.py — Seed test members and provide lookup endpoint
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.claim import Member

router = APIRouter()

# All 10 test members from test_cases.json
TEST_MEMBERS = [
    {"member_id": "EMP001", "name": "Rajesh Kumar",  "join_date": "2023-01-01", "claims_ytd": 0},
    {"member_id": "EMP002", "name": "Priya Singh",   "join_date": "2023-01-01", "claims_ytd": 0},
    {"member_id": "EMP003", "name": "Amit Verma",    "join_date": "2023-01-01", "claims_ytd": 0},
    {"member_id": "EMP004", "name": "Sneha Reddy",   "join_date": "2023-01-01", "claims_ytd": 0},
    {"member_id": "EMP005", "name": "Vikram Joshi",  "join_date": "2024-09-01", "claims_ytd": 0},
    {"member_id": "EMP006", "name": "Kavita Nair",   "join_date": "2023-01-01", "claims_ytd": 0},
    {"member_id": "EMP007", "name": "Suresh Patil",  "join_date": "2023-01-01", "claims_ytd": 0},
    {"member_id": "EMP008", "name": "Ravi Menon",    "join_date": "2023-01-01", "claims_ytd": 0},
    {"member_id": "EMP009", "name": "Anita Desai",   "join_date": "2023-01-01", "claims_ytd": 0},
    {"member_id": "EMP010", "name": "Deepak Shah",   "join_date": "2023-01-01", "claims_ytd": 0},
]


@router.post("/seed")
async def seed_members(db: AsyncSession = Depends(get_db)):
    """
    Seed the database with test members from test_cases.json.
    Call this once after the DB is created.
    """
    added = 0
    for m in TEST_MEMBERS:
        existing = await db.execute(
            select(Member).where(Member.member_id == m["member_id"])
        )
        if not existing.scalar_one_or_none():
            member = Member(
                member_id=m["member_id"],
                name=m["name"],
                join_date=m["join_date"],
                claims_ytd=m["claims_ytd"],
                policy_status="active",
                annual_limit=50000.0,
            )
            db.add(member)
            added += 1

    await db.commit()
    return {"message": f"Seeded {added} new members", "total": len(TEST_MEMBERS)}


@router.get("/{member_id}")
async def get_member(member_id: str, db: AsyncSession = Depends(get_db)):
    """Look up a member by their employee ID."""
    result = await db.execute(
        select(Member).where(Member.member_id == member_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail=f"Member {member_id} not found")

    return {
        "member_id": member.member_id,
        "name": member.name,
        "policy_status": member.policy_status,
        "join_date": member.join_date,
        "annual_limit": member.annual_limit,
        "claims_ytd": member.claims_ytd,
        "remaining_limit": member.annual_limit - member.claims_ytd,
    }