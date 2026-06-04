from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, AsyncSessionLocal
from app.routers import claims, members, test_runner
from app.models.claim import Member
from sqlalchemy import select
import uvicorn


# ─── Test members from test_cases.json ──────────
SEED_MEMBERS = [
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


async def _seed_members():
    """Auto-seed test members if they don't already exist."""
    async with AsyncSessionLocal() as session:
        for m in SEED_MEMBERS:
            existing = await session.execute(
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
                session.add(member)
        await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run DB init + seed on startup."""
    await init_db()
    await _seed_members()
    print("[OK] Database initialized and test members seeded.")
    yield
    # (shutdown logic goes here if needed)


app = FastAPI(
    title="Plum OPD Adjudication API",
    description="AI-powered OPD claim adjudication system for Indian health insurance",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow requests from Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "Plum OPD Adjudication API is running",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(claims.router, prefix="/api/claims", tags=["Claims"])
app.include_router(members.router, prefix="/api/members", tags=["Members"])
app.include_router(test_runner.router, prefix="/api/test", tags=["Test Runner"])


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)