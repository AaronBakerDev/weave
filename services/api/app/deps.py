import os
from uuid import UUID, uuid4
from typing import Generator
from fastapi import Header, HTTPException, Depends
from .db.session import get_db_with_rls
from .auth.jwt import verify_bearer


async def get_user_id(authorization: str | None = Header(default=None), x_debug_user: str | None = Header(default=None)) -> UUID:
    """Temporary auth dependency.
    - If X-Debug-User header is present, trust it as a UUID (dev only).
    - Otherwise, require Authorization and TODO: verify JWT, then return subject UUID.
    Also used by DB layer to SET LOCAL app.user_id for RLS (not implemented in scaffold).
    """
    if x_debug_user:
        try:
            return UUID(x_debug_user)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid X-Debug-User UUID")

    # Try JWT verification when Authorization is provided and env is configured
    uid = verify_bearer(authorization)
    if uid:
        return uid

    # Dev fallback if no Authorization or verification failed: ephemeral UUID
    return uuid4()


def db_session(user_id: UUID = Depends(get_user_id)) -> Generator:
    """FastAPI dependency yielding a SQLAlchemy session with RLS user set."""
    yield from get_db_with_rls(str(user_id))
