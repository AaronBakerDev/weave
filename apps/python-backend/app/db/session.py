"""
Database Session Management

Async SQLAlchemy session factory and dependency injection
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from app.config import settings
from app.db.models import Base


# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    future=True,
)

# Create async session factory
SessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    """
    Dependency: Get database session

    Usage:
        async def my_endpoint(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database schema"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Close database connections"""
    await engine.dispose()
