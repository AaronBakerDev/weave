from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from uuid import UUID

from ..deps import get_user_id, db_session
from ..db.models_orm import Memory
from ..models import MemoryDetailResp
from .memories import get_memory as _get_memory  # reuse response building

router = APIRouter(prefix="/v1/public", tags=["public"])


@router.get("/{slug}", response_model=MemoryDetailResp)
async def get_public_by_slug(slug: str, user_id: UUID = Depends(get_user_id), db: Session = Depends(db_session)):
    row = db.execute(text("select memory_id from public_memory_slug where slug = :slug"), {"slug": slug}).one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    mid = row[0]
    # get_memory already enforces RLS; PUBLIC memories are visible to everyone
    return await _get_memory(mid, user_id, db)

