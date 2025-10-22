from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from uuid import UUID

from ..deps import get_user_id, db_session

router = APIRouter(prefix="/v1", tags=["graph"]) 


@router.get("/graph")
async def get_graph(limit: int = 200, user_id: UUID = Depends(get_user_id), db: Session = Depends(db_session)):
    limit = max(10, min(limit, 500))
    nodes = db.execute(
        text(
            "select id, title, visibility, created_at from memory where coalesce(status,'ACTIVE') <> 'DELETED' order by created_at desc limit :limit"
        ),
        {"limit": limit},
    ).all()
    edges = db.execute(
        text(
            "select a_memory_id, b_memory_id, relation from memory_edge order by created_at desc limit 2000"
        )
    ).all()
    return {
        "nodes": [{"id": r[0], "title": r[1], "visibility": r[2], "created_at": r[3]} for r in nodes],
        "edges": [{"a": r[0], "b": r[1], "relation": r[2]} for r in edges],
    }

