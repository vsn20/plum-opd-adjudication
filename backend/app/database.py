from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./claims.db")

engine = create_async_engine(DATABASE_URL, echo=False)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def init_db():
    """Create all tables on startup."""
    # Import here (inside the function) to avoid circular imports at module load time.
    # By the time init_db() is called, all models are already registered on Base.
    import app.models.claim  # noqa: F401 — registers Member, Claim, Document, Decision on Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Dependency — yields a DB session and closes it after the request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()