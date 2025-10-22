from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID, uuid4
from datetime import datetime, timedelta

from sqlalchemy import select, insert, update
from sqlalchemy.orm import Session

from ..deps import get_user_id, db_session
from ..db.models_orm import Memory
from sqlalchemy import text

router = APIRouter(prefix="/v1", tags=["invites"])


@router.post("/invites")
async def create_invite(
    memory_id: UUID,
    role: str,
    user_id: UUID = Depends(get_user_id),
    db: Session = Depends(db_session),
):
    if role not in ("CONTRIBUTOR", "VIEWER"):
        raise HTTPException(status_code=400, detail="Invalid role")

    mem = db.execute(select(Memory).where(Memory.id == memory_id)).scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")
    if mem.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only owner can invite")

    token = uuid4()
    expires_at = datetime.utcnow() + timedelta(days=7)
    db.execute(
        text(
            """
            insert into invite (token, memory_id, role, created_by, expires_at)
            values (:t, :mid, :role, :uid, :exp)
            on conflict (token) do nothing
            """
        ),
        {"t": str(token), "mid": str(memory_id), "role": role, "uid": str(user_id), "exp": expires_at},
    )
    return {"invite_id": str(token), "status": "pending", "expires_at": expires_at}


@router.post("/invites/{token}/accept")
async def accept_invite(
    token: UUID,
    user_id: UUID = Depends(get_user_id),
    db: Session = Depends(db_session),
):
    row = db.execute(
        text(
            """
            select memory_id, role, expires_at, accepted_by from invite where token = :t
            """
        ),
        {"t": str(token)},
    ).one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Invite not found")
    memory_id, role, expires_at, accepted_by = row
    if accepted_by:
        return {"status": "already_accepted"}
    if expires_at and datetime.utcnow() > expires_at:
        raise HTTPException(status_code=410, detail="Invite expired")

    # Upsert participant as role
    db.execute(
        text(
            """
            insert into participant (memory_id, user_id, role)
            values (:mid, :uid, :role)
            on conflict (memory_id, user_id) do update set role = excluded.role
            """
        ),
        {"mid": str(memory_id), "uid": str(user_id), "role": role},
    )
    db.execute(
        text("update invite set accepted_by = :uid, accepted_at = now() where token = :t"),
        {"uid": str(user_id), "t": str(token)},
    )
    return {"status": "accepted"}
