from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, insert, delete, text
from sqlalchemy.orm import Session
from uuid import UUID

from ..deps import get_user_id, db_session
from ..db.models_orm import AppUser

router = APIRouter(prefix="/v1", tags=["follows"])


@router.post("/follow/{handle}")
async def follow_user(handle: str, user_id: UUID = Depends(get_user_id), db: Session = Depends(db_session)):
    target = db.execute(select(AppUser).where(AppUser.handle == handle)).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    db.execute(
        text(
            "insert into user_follow (follower_id, followee_id) values (:f, :e) on conflict do nothing"
        ),
        {"f": str(user_id), "e": str(target.id)},
    )
    return {"ok": True}


@router.delete("/follow/{handle}")
async def unfollow_user(handle: str, user_id: UUID = Depends(get_user_id), db: Session = Depends(db_session)):
    target = db.execute(select(AppUser).where(AppUser.handle == handle)).scalar_one_or_none()
    if not target:
        return {"ok": True}
    db.execute(text("delete from user_follow where follower_id = :f and followee_id = :e"), {"f": str(user_id), "e": str(target.id)})
    return {"ok": True}


@router.get("/following")
async def list_following(user_id: UUID = Depends(get_user_id), db: Session = Depends(db_session)):
    rows = db.execute(text("select followee_id from user_follow where follower_id = :f"), {"f": str(user_id)}).all()
    return {"following": [r[0] for r in rows]}


@router.get("/users/{handle}/memories/public")
async def list_public_memories(handle: str, user_id: UUID = Depends(get_user_id), db: Session = Depends(db_session)):
    target = db.execute(select(AppUser).where(AppUser.handle == handle)).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    rows = db.execute(
        text(
            "select id, title, created_at from memory where owner_id = :uid and visibility = 'PUBLIC' and status <> 'DELETED' order by created_at desc limit 100"
        ),
        {"uid": str(target.id)},
    ).all()
    return {"memories": [{"id": r[0], "title": r[1], "created_at": r[2]} for r in rows]}

