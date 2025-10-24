from fastapi import APIRouter, Depends, Header, HTTPException
from uuid import UUID, uuid4
from typing import Optional
from datetime import datetime

from sqlalchemy import select, insert, update, func, text
from sqlalchemy.orm import Session

from ..models import (
    CreateMemoryReq,
    MemoryRef,
    SetCoreReq,
    LockCoreResp,
    AppendLayerReq,
    SetPermissionsReq,
    MemoryDetailResp,
    CoreOut,
    LayerOut,
    ParticipantOut,
    ArtifactMeta,
)
from ..deps import get_user_id, db_session
from ..db.models_orm import AppUser, Memory, Participant, MemoryLayer, IdempotencyKey, MemoryCoreVersion, Artifact

router = APIRouter(prefix="/v1/memories", tags=["memories"])


@router.get("")
async def list_memories(
    limit: int = 20,
    user_id: UUID = Depends(get_user_id),
    db: Session = Depends(db_session),
):
    """List recent memories for the current user"""
    limit = max(1, min(limit, 100))

    # Get memories where user is a participant
    memories = db.execute(
        select(Memory)
        .join(Participant, Memory.id == Participant.memory_id)
        .where(
            Participant.user_id == user_id,
            Memory.status != "DELETED"
        )
        .order_by(Memory.created_at.desc())
        .limit(limit)
    ).scalars().all()

    result = []
    for mem in memories:
        # Get the core if it exists
        core_version = db.execute(
            select(MemoryCoreVersion)
            .where(MemoryCoreVersion.memory_id == mem.id)
            .order_by(MemoryCoreVersion.version.desc())
            .limit(1)
        ).scalar_one_or_none()

        core_data = None
        if core_version:
            core_data = {
                "narrative": core_version.narrative,
                "locked": core_version.locked,
            }

        result.append({
            "id": str(mem.id),
            "title": mem.title,
            "created_at": mem.created_at.isoformat() if mem.created_at else None,
            "core": core_data,
        })

    return {"memories": result}


@router.post("", response_model=MemoryRef)
async def create_memory(
    req: CreateMemoryReq,
    user_id: UUID = Depends(get_user_id),
    idem_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(db_session),
):
    # If idempotency key provided, try to short-circuit
    if idem_key:
        row = db.execute(
            select(IdempotencyKey.resource_id).where(
                IdempotencyKey.user_id == user_id,
                IdempotencyKey.endpoint == "/v1/memories",
                IdempotencyKey.key == idem_key,
            )
        ).one_or_none()
        if row and row[0] is not None:
            mem = db.execute(select(Memory).where(Memory.id == row[0])).scalar_one_or_none()
            if mem:
                return MemoryRef(id=mem.id, title=mem.title, visibility=req.visibility, created_at=mem.created_at)

        # Reserve the key (no resource yet)
        try:
            db.execute(
                insert(IdempotencyKey).values(
                    user_id=user_id,
                    endpoint="/v1/memories",
                    key=idem_key,
                )
            )
        except Exception:
            # Ignore conflicts; another concurrent request may own it
            pass

    # Ensure user exists (dev convenience)
    user = db.execute(select(AppUser).where(AppUser.id == user_id)).scalar_one_or_none()
    if not user:
        handle = f"user-{str(user_id)[:8]}"
        db.execute(insert(AppUser).values(id=user_id, handle=handle))

    mem_id = uuid4()
    db.execute(
        insert(Memory).values(
            id=mem_id,
            owner_id=user_id,
            visibility=req.visibility,
            title=req.title,
        )
    )
    # Add owner as participant for unified permission checks
    db.execute(
        insert(Participant).values(memory_id=mem_id, user_id=user_id, role="OWNER")
    )

    # Optional seed layer
    if req.seed_text:
        db.execute(
            insert(MemoryLayer).values(
                id=uuid4(),
                memory_id=mem_id,
                author_id=user_id,
                kind="TEXT",
                text_content=req.seed_text,
            )
        )
        # Enqueue indexing for seed text
        db.execute(text("insert into memory_event(memory_id, kind) values (:mid, 'INDEX_MEMORY')"), {"mid": str(mem_id)})

    # If we reserved an idempotency key, attach resource_id
    if idem_key:
        try:
            db.execute(
                update(IdempotencyKey)
                .where(
                    IdempotencyKey.user_id == user_id,
                    IdempotencyKey.endpoint == "/v1/memories",
                    IdempotencyKey.key == idem_key,
                )
                .values(resource_id=mem_id)
            )
        except Exception:
            pass

    # Fetch created_at for response
    mem = db.execute(select(Memory).where(Memory.id == mem_id)).scalar_one()
    return MemoryRef(id=mem.id, title=mem.title, visibility=req.visibility, created_at=mem.created_at)


@router.get("/{mid}", response_model=MemoryDetailResp)
async def get_memory(
    mid: UUID,
    user_id: UUID = Depends(get_user_id),
    db: Session = Depends(db_session),
):
    mem = db.execute(select(Memory).where(Memory.id == mid)).scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")
    if getattr(mem, 'status', 'ACTIVE') == 'DELETED':
        raise HTTPException(status_code=410, detail="Memory deleted")

    # Resolve core: prefer locked at current_core_version; else draft
    core = None
    if mem.current_core_version is not None:
        core_row = db.execute(
            select(MemoryCoreVersion).where(
                MemoryCoreVersion.memory_id == mid,
                MemoryCoreVersion.version == mem.current_core_version,
                MemoryCoreVersion.locked.is_(True),
            )
        ).scalar_one_or_none()
    else:
        core_row = db.execute(
            select(MemoryCoreVersion).where(
                MemoryCoreVersion.memory_id == mid,
                MemoryCoreVersion.locked.is_(False),
            )
        ).scalar_one_or_none()

    if core_row:
        when_start = getattr(core_row.when, 'lower', None)() if getattr(core_row, 'when', None) else None
        when_end = getattr(core_row.when, 'upper', None)() if getattr(core_row, 'when', None) else None
        core = CoreOut(
            version=core_row.version,
            narrative=core_row.narrative,
            anchors=list(core_row.anchors or []),
            people=list(core_row.people or []),
            when_start=when_start,
            when_end=when_end,
            where=core_row.where,
            locked=bool(core_row.locked),
            locked_at=core_row.locked_at,
        )

    # Layers (join artifact info when present)
    layers_rows = db.execute(
        select(
            MemoryLayer.id,
            MemoryLayer.kind,
            MemoryLayer.text_content,
            MemoryLayer.artifact_id,
            MemoryLayer.meta,
            MemoryLayer.author_id,
            MemoryLayer.created_at,
            Artifact.id,
            Artifact.mime,
            Artifact.bytes,
        )
        .select_from(MemoryLayer)
        .join(Memory, Memory.id == MemoryLayer.memory_id)
        .outerjoin(Artifact, Artifact.id == MemoryLayer.artifact_id)
        .where(MemoryLayer.memory_id == mid)
        .order_by(MemoryLayer.created_at.asc())
    ).all()

    layers: list[LayerOut] = []
    for r in layers_rows:
        art = None
        if r[7]:  # Artifact.id present
            art = ArtifactMeta(id=r[7], mime=r[8], bytes=r[9])
        layers.append(
            LayerOut(
                id=r[0],
                kind=r[1],
                text_content=r[2],
                artifact_id=r[3],
                artifact=art,
                meta=r[4] or {},
                author_id=r[5],
                created_at=r[6],
            )
        )

    # Participants
    parts_rows = db.execute(
        select(
            Participant.user_id,
            Participant.role,
            AppUser.handle,
            AppUser.display_name,
        )
        .select_from(Participant)
        .join(AppUser, AppUser.id == Participant.user_id)
        .where(Participant.memory_id == mid)
    ).all()
    participants = [
        ParticipantOut(user_id=r[0], role=r[1], handle=r[2], display_name=r[3]) for r in parts_rows
    ]

    # Edges summary (counts by relation) and small connections list
    from sqlalchemy import or_
    counts_rows = db.execute(
        select(func.coalesce(func.count(), 0),).select_from(Memory)  # dummy to ensure type
    )
    # Proper counts
    edge_counts = db.execute(
        text(
            """
            select relation, count(*) as c
            from memory_edge
            where a_memory_id = :mid or b_memory_id = :mid
            group by relation
            """
        ),
        {"mid": str(mid)},
    ).all()
    counts = {row[0]: row[1] for row in edge_counts}

    connections_rows = db.execute(
        text(
            """
            select case when a_memory_id = :mid then b_memory_id else a_memory_id end as other_id,
                   relation
            from memory_edge
            where a_memory_id = :mid or b_memory_id = :mid
            order by created_at desc
            limit 12
            """
        ),
        {"mid": str(mid)},
    ).all()
    connections = [{"memory_id": r[0], "relation": r[1]} for r in connections_rows]

    return MemoryDetailResp(
        id=mem.id,
        title=mem.title,
        visibility=mem.visibility,  # type: ignore
        created_at=mem.created_at,
        core=core,
        layers=layers,
        participants=participants,
        edges_summary={"counts": counts, "connections": connections},
    )


@router.get("/{mid}/suggestions")
async def memory_suggestions(
    mid: UUID,
    limit: int = 5,
    user_id: UUID = Depends(get_user_id),
    db: Session = Depends(db_session),
):
    # Use vector similarity to suggest related memories; exclude self
    limit = max(1, min(limit, 10))
    # Ensure memory exists
    mem = db.execute(select(Memory).where(Memory.id == mid)).scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")
    if getattr(mem, 'status', 'ACTIVE') == 'DELETED':
        raise HTTPException(status_code=410, detail="Memory deleted")

    rows = db.execute(
        text(
            """
            select m.id, m.title, m.visibility, m.created_at,
                   (1 - coalesce(m.embedding <=> src.embedding, 1)) as sim
            from memory m
            cross join (select embedding from memory where id = :mid) as src
            where m.id <> :mid and m.embedding is not null
            order by sim desc
            limit :limit
            """
        ),
        {"mid": str(mid), "limit": limit},
    ).all()
    return {
        "memory_id": str(mid),
        "suggestions": [
            {"memory": {"id": r[0], "title": r[1], "visibility": r[2], "created_at": r[3]}, "score": float(r[4])}
            for r in rows
        ],
    }


@router.put("/{mid}/core")
async def set_core(
    mid: UUID,
    req: SetCoreReq,
    user_id: UUID = Depends(get_user_id),
    db: Session = Depends(db_session),
):
    # Ensure memory exists (RLS will restrict visibility). We still 404 if not visible/existent.
    mem = db.execute(select(Memory).where(Memory.id == mid)).scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")
    if getattr(mem, 'status', 'ACTIVE') == 'DELETED':
        raise HTTPException(status_code=410, detail="Memory deleted")

    # Check for existing draft
    draft = db.execute(
        select(MemoryCoreVersion)
        .where(MemoryCoreVersion.memory_id == mid, MemoryCoreVersion.locked.is_(False))
        .limit(1)
    ).scalar_one_or_none()

    # Latest locked version number
    latest_locked = db.execute(
        select(func.max(MemoryCoreVersion.version)).where(
            MemoryCoreVersion.memory_id == mid, MemoryCoreVersion.locked.is_(True)
        )
    ).scalar_one()
    base_version = latest_locked or 0

    # Build tstzrange if provided
    when_range = None
    if req.when_start or req.when_end:
        when_range = func.tstzrange(req.when_start, req.when_end, '[]')

    if draft:
        # Update existing draft
        db.execute(
            update(MemoryCoreVersion)
            .where(MemoryCoreVersion.id == draft.id)
            .values(
                narrative=req.narrative,
                anchors=req.anchors,
                people=req.people,
                when=when_range,
                where=req.where,
            )
        )
        version = draft.version
        status = "updated"
    else:
        # No draft exists. If there is a locked version and lift is not set → 409
        if base_version > 0 and not req.lift:
            raise HTTPException(status_code=409, detail="Core is locked. Pass lift=true to start a new draft version.")

        version = base_version + 1
        db.execute(
            insert(MemoryCoreVersion).values(
                memory_id=mid,
                version=version,
                narrative=req.narrative,
                anchors=req.anchors,
                people=req.people,
                when=when_range,
                where=req.where,
                locked=False,
                created_by=user_id,
            )
        )
        status = "created"

    return {"core_version": version, "locked": False, "status": status}


@router.post("/{mid}/lock", response_model=LockCoreResp)
async def lock_core(
    mid: UUID,
    user_id: UUID = Depends(get_user_id),
    db: Session = Depends(db_session),
):
    # Ensure memory exists and is visible (RLS enforced). If not, 404.
    mem = db.execute(select(Memory).where(Memory.id == mid)).scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")

    # Try to lock existing draft
    draft = db.execute(
        select(MemoryCoreVersion)
        .where(MemoryCoreVersion.memory_id == mid, MemoryCoreVersion.locked.is_(False))
        .with_for_update()
    ).scalar_one_or_none()

    if draft:
        locked_at = datetime.utcnow()
        # Set locked, update memory pointer
        db.execute(
            update(MemoryCoreVersion)
            .where(MemoryCoreVersion.id == draft.id)
            .values(locked=True, locked_at=locked_at)
        )
        db.execute(
            update(Memory).where(Memory.id == mid).values(current_core_version=draft.version)
        )
        # Enqueue indexing
        db.execute(text("insert into memory_event(memory_id, kind) values (:mid, 'INDEX_MEMORY')"), {"mid": str(mid)})
        return LockCoreResp(memory_id=mid, version=draft.version, locked_at=locked_at)

    # No draft; maybe it's already locked — return last locked to make this idempotent
    last_locked = db.execute(
        select(MemoryCoreVersion)
        .where(MemoryCoreVersion.memory_id == mid, MemoryCoreVersion.locked.is_(True))
        .order_by(MemoryCoreVersion.version.desc())
        .limit(1)
    ).scalar_one_or_none()
    if last_locked:
        return LockCoreResp(memory_id=mid, version=last_locked.version, locked_at=last_locked.locked_at or last_locked.created_at)

    # No draft and no locked core
    raise HTTPException(status_code=409, detail="No draft core to lock.")


@router.post("/{mid}/layers")
async def append_layer(
    mid: UUID,
    req: AppendLayerReq,
    user_id: UUID = Depends(get_user_id),
    idem_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(db_session),
):
    # Validate memory exists and caller has at least viewer access (RLS select). 404 if not visible.
    mem = db.execute(select(Memory).where(Memory.id == mid)).scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")

    # Server-side permission: owner or contributor may append
    is_owner = mem.owner_id == user_id
    is_contrib = db.execute(
        select(Participant).where(
            Participant.memory_id == mid,
            Participant.user_id == user_id,
            Participant.role.in_(["OWNER", "CONTRIBUTOR"]),
        )
    ).first() is not None
    if not (is_owner or is_contrib):
        raise HTTPException(status_code=403, detail="Not allowed to append layers")

    endpoint = f"/v1/memories/{mid}/layers"
    if idem_key:
        row = db.execute(
            select(IdempotencyKey.resource_id).where(
                IdempotencyKey.user_id == user_id,
                IdempotencyKey.endpoint == endpoint,
                IdempotencyKey.key == idem_key,
            )
        ).one_or_none()
        if row and row[0] is not None:
            return {"layer_id": row[0], "visibility": mem.visibility}
        try:
            db.execute(
                insert(IdempotencyKey).values(
                    user_id=user_id,
                    endpoint=endpoint,
                    key=idem_key,
                )
            )
        except Exception:
            pass

    kind = req.kind
    layer_id = uuid4()

    # Validation by kind
    if kind in ("TEXT", "REFLECTION"):
        if not (req.text_content and req.text_content.strip()):
            raise HTTPException(status_code=400, detail="text_content required for TEXT/REFLECTION")
        db.execute(
            insert(MemoryLayer).values(
                id=layer_id,
                memory_id=mid,
                author_id=user_id,
                kind=kind,
                text_content=req.text_content,
                meta=req.meta or {},
            )
        )
        # Enqueue indexing on text content
        db.execute(text("insert into memory_event(memory_id, kind) values (:mid, 'INDEX_MEMORY')"), {"mid": str(mid)})
    elif kind in ("IMAGE", "VIDEO", "AUDIO"):
        if not req.artifact_id:
            raise HTTPException(status_code=400, detail="artifact_id required for media kinds")
        art = db.execute(
            select(Artifact).where(Artifact.id == req.artifact_id, Artifact.memory_id == mid)
        ).scalar_one_or_none()
        if not art:
            raise HTTPException(status_code=400, detail="artifact not found for this memory")
        db.execute(
            insert(MemoryLayer).values(
                id=layer_id,
                memory_id=mid,
                author_id=user_id,
                kind=kind,
                artifact_id=req.artifact_id,
                meta=req.meta or {},
            )
        )
        # Enqueue indexing (for captions/metadata in non-text layers)
        db.execute(text("insert into memory_event(memory_id, kind) values (:mid, 'INDEX_MEMORY')"), {"mid": str(mid)})
    elif kind == "LINK":
        url = (req.meta or {}).get("url") if isinstance(req.meta, dict) else None
        if not url or not isinstance(url, str):
            raise HTTPException(status_code=400, detail="meta.url required for LINK kind")
        db.execute(
            insert(MemoryLayer).values(
                id=layer_id,
                memory_id=mid,
                author_id=user_id,
                kind=kind,
                meta=req.meta,
            )
        )
        # Enqueue indexing (for link metadata)
        db.execute(text("insert into memory_event(memory_id, kind) values (:mid, 'INDEX_MEMORY')"), {"mid": str(mid)})
    else:
        raise HTTPException(status_code=400, detail="unsupported layer kind")

    if idem_key:
        try:
            db.execute(
                update(IdempotencyKey)
                .where(
                    IdempotencyKey.user_id == user_id,
                    IdempotencyKey.endpoint == endpoint,
                    IdempotencyKey.key == idem_key,
                )
                .values(resource_id=layer_id)
            )
        except Exception:
            pass

    return {"layer_id": layer_id, "visibility": mem.visibility}


@router.post("/{mid}/permissions")
async def set_permissions(
    mid: UUID,
    req: SetPermissionsReq,
    user_id: UUID = Depends(get_user_id),
    db: Session = Depends(db_session),
):
    # Owner-only
    mem = db.execute(select(Memory).where(Memory.id == mid)).scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")
    if mem.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only owner can change permissions")

    # Update visibility
    db.execute(update(Memory).where(Memory.id == mid).values(visibility=req.visibility))

    # Upsert participants (ignore OWNER changes)
    for p in req.participants or []:
        try:
            uid = UUID(p.get("user_id")) if isinstance(p.get("user_id"), str) else p.get("user_id")
            role = p.get("role")
            if not uid or role not in ("CONTRIBUTOR", "VIEWER"):
                continue
            db.execute(
                text(
                    """
                    insert into participant (memory_id, user_id, role)
                    values (:mid, :uid, :role)
                    on conflict (memory_id, user_id) do update set role = excluded.role
                    """
                ),
                {"mid": str(mid), "uid": str(uid), "role": role},
            )
        except Exception:
            continue

    # Public slug create/revoke
    if req.visibility == "PUBLIC":
        # Ensure slug exists
        slug = _make_slug(mem.title or "memory", str(mid))
        db.execute(
            text(
                "insert into public_memory_slug (memory_id, slug) values (:mid, :slug) on conflict (memory_id) do nothing"
            ),
            {"mid": str(mid), "slug": slug},
        )
    else:
        db.execute(text("delete from public_memory_slug where memory_id = :mid"), {"mid": str(mid)})

    # Count participants
    count = db.execute(text("select count(*) from participant where memory_id = :mid"), {"mid": str(mid)}).scalar_one()
    return {"updated_at": datetime.utcnow(), "participant_count": int(count)}


@router.delete("/{mid}")
async def delete_memory(
    mid: UUID,
    user_id: UUID = Depends(get_user_id),
    db: Session = Depends(db_session),
):
    mem = db.execute(select(Memory).where(Memory.id == mid)).scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")
    if mem.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only owner can delete memory")
    db.execute(update(Memory).where(Memory.id == mid).values(status='DELETED'))
    db.execute(text("delete from public_memory_slug where memory_id = :mid"), {"mid": str(mid)})
    return {"status": "deleted"}


def _make_slug(title: str, mid: str) -> str:
    import re

    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    short = mid.split("-")[0]
    if not s:
        s = "memory"
    return f"{s}-{short}"
