from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from sqlalchemy import select, insert
from sqlalchemy.orm import Session

from ..models import WeaveReq
from ..deps import get_user_id, db_session
from ..db.models_orm import Memory, Participant
from sqlalchemy import text

router = APIRouter(prefix="/v1", tags=["weave"])


@router.post("/weaves")
async def create_weave(
    req: WeaveReq,
    user_id: UUID = Depends(get_user_id),
    db: Session = Depends(db_session),
):
    if req.a_id == req.b_id:
        raise HTTPException(status_code=400, detail="Cannot weave a memory to itself")

    # Ensure both memories exist (and are visible via RLS)
    a = db.execute(select(Memory).where(Memory.id == req.a_id)).scalar_one_or_none()
    b = db.execute(select(Memory).where(Memory.id == req.b_id)).scalar_one_or_none()
    if not a or not b:
        raise HTTPException(status_code=404, detail="One or both memories not found")

    # Canonical order to respect unique (a,b,relation)
    a_id, b_id = (req.a_id, req.b_id) if str(req.a_id) < str(req.b_id) else (req.b_id, req.a_id)

    # Insert edge (owner-only per RLS insert policy)
    try:
        row = db.execute(
            text(
                """
                insert into memory_edge (id, a_memory_id, b_memory_id, relation, strength, note, created_by)
                values (gen_random_uuid(), :a, :b, :rel, :s, :note, :uid)
                on conflict (a_memory_id, b_memory_id, relation) do update set strength = excluded.strength, note = excluded.note
                returning id, strength
                """
            ),
            {"a": str(a_id), "b": str(b_id), "rel": req.relation, "s": req.strength or 0.5, "note": req.note, "uid": str(user_id)},
        ).one()
    except Exception as e:
        raise HTTPException(status_code=403, detail="Not allowed to create weave (owner required)")

    return {"edge_id": row[0], "strength": row[1]}
