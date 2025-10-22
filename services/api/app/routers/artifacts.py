from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from uuid import UUID, uuid4
from hashlib import sha256

from sqlalchemy import select, insert
from sqlalchemy.orm import Session

from ..deps import get_user_id, db_session
from ..db.models_orm import Memory, Participant, Artifact
from ..storage.s3 import put_fileobj, presign_get_url

router = APIRouter(prefix="/v1", tags=["artifacts"])


@router.post("/artifacts/upload")
async def upload_artifact(
    memory_id: UUID,
    file: UploadFile = File(...),
    user_id: UUID = Depends(get_user_id),
    db: Session = Depends(db_session),
):
    # Ensure memory exists and user is owner or contributor
    mem = db.execute(select(Memory).where(Memory.id == memory_id)).scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")

    is_owner = mem.owner_id == user_id
    is_contrib = db.execute(
        select(Participant).where(
            Participant.memory_id == memory_id,
            Participant.user_id == user_id,
            Participant.role.in_(["OWNER", "CONTRIBUTOR"]),
        )
    ).first() is not None
    if not (is_owner or is_contrib):
        raise HTTPException(status_code=403, detail="Not allowed to upload artifacts")

    # Compute sha256 and size; then rewind and upload to S3
    hasher = sha256()
    total = 0
    # Read chunks to compute hash
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        hasher.update(chunk)
        total += len(chunk)

    digest = hasher.hexdigest()
    # Rewind the file for upload
    await file.seek(0)

    # Choose storage key
    filename = file.filename or "upload.bin"
    key = f"mem/{memory_id}/{uuid4()}_{filename}"

    # Upload streaming to S3
    # FastAPI's UploadFile exposes a SpooledTemporaryFile that is file-like for boto3
    put_fileobj(key, file.file, content_type=file.content_type)

    # Insert artifact row; handle owner-level dedupe on sha256
    existing = db.execute(
        select(Artifact).where(Artifact.owner_id == user_id, Artifact.sha256 == digest)
    ).scalar_one_or_none()
    if existing:
        if str(existing.memory_id) != str(memory_id):
            raise HTTPException(status_code=409, detail="Artifact already exists under a different memory for this owner")
        art = existing
    else:
        art_id = uuid4()
        db.execute(
            insert(Artifact).values(
                id=art_id,
                memory_id=memory_id,
                owner_id=user_id,
                mime=file.content_type or "application/octet-stream",
                storage_key=key,
                sha256=digest,
                bytes=total,
            )
        )
        art = db.execute(select(Artifact).where(Artifact.id == art_id)).scalar_one()

    url = presign_get_url(art.storage_key)
    return {"artifact_id": str(art.id), "url": url, "bytes": art.bytes, "mime": art.mime}


@router.get("/artifacts/{artifact_id}/download")
async def download_artifact(
    artifact_id: UUID,
    ttl: int = 86400,
    user_id: UUID = Depends(get_user_id),
    db: Session = Depends(db_session),
):
    # Clamp TTL for safety (5 minutes to 7 days)
    ttl = max(300, min(ttl, 7 * 24 * 3600))

    art = db.execute(select(Artifact).where(Artifact.id == artifact_id)).scalar_one_or_none()
    if not art:
        raise HTTPException(status_code=404, detail="Artifact not found")

    url = presign_get_url(art.storage_key, ttl_seconds=ttl)
    return {"url": url, "mime": art.mime, "bytes": art.bytes, "expires_in": ttl}
