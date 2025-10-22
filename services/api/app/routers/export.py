from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from uuid import UUID

from ..deps import get_user_id, db_session

router = APIRouter(prefix="/v1", tags=["export"]) 


@router.get("/export")
async def export_all(user_id: UUID = Depends(get_user_id), db: Session = Depends(db_session)):
    # Minimal export: list memories owned by user with core and layers
    rows = db.execute(
        text(
            "select id from memory where owner_id = :uid and coalesce(status,'ACTIVE') <> 'DELETED' order by created_at"
        ),
        {"uid": str(user_id)},
    ).all()

    def get_mem(mid):
        m = db.execute(text("select id, title, visibility, created_at from memory where id = :mid"), {"mid": str(mid)}).one()
        core = db.execute(
            text(
                "select version, narrative, anchors, people, \"when\", \"where\", locked, locked_at from memory_core_version where memory_id = :mid order by version"
            ),
            {"mid": str(mid)},
        ).all()
        layers = db.execute(
            text(
                "select id, kind, text_content, meta, artifact_id, author_id, created_at from memory_layer where memory_id = :mid order by created_at"
            ),
            {"mid": str(mid)},
        ).all()
        return {
            "id": m[0],
            "title": m[1],
            "visibility": m[2],
            "created_at": m[3],
            "cores": [
                {
                    "version": c[0],
                    "narrative": c[1],
                    "anchors": c[2],
                    "people": c[3],
                    "when": c[4],
                    "where": c[5],
                    "locked": c[6],
                    "locked_at": c[7],
                }
                for c in core
            ],
            "layers": [
                {
                    "id": l[0],
                    "kind": l[1],
                    "text_content": l[2],
                    "meta": l[3],
                    "artifact_id": l[4],
                    "author_id": l[5],
                    "created_at": l[6],
                }
                for l in layers
            ],
        }

    return {"memories": [get_mem(r[0]) for r in rows]}

