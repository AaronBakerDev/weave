from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    text,
    Integer,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSTZRANGE
from sqlalchemy.orm import declarative_base
from sqlalchemy import func, Boolean, BigInteger


Base = declarative_base()


class AppUser(Base):
    __tablename__ = "app_user"

    id = Column(UUID(as_uuid=True), primary_key=True)
    handle = Column(String, unique=True, nullable=False)
    display_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("now()"))


class Memory(Base):
    __tablename__ = "memory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("app_user.id"), nullable=False)
    visibility = Column(String, CheckConstraint("visibility in ('PRIVATE','SHARED','PUBLIC')"), nullable=False)
    title = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("now()"))
    status = Column(String, nullable=False, server_default=text("'ACTIVE'"))
    current_core_version = Column(Integer, nullable=True)


class Participant(Base):
    __tablename__ = "participant"

    memory_id = Column(UUID(as_uuid=True), ForeignKey("memory.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("app_user.id"), primary_key=True)
    role = Column(String, CheckConstraint("role in ('OWNER','CONTRIBUTOR','VIEWER')"), nullable=False)
    invited_by = Column(UUID(as_uuid=True), ForeignKey("app_user.id"), nullable=True)
    joined_at = Column(DateTime(timezone=True), server_default=text("now()"))


class MemoryLayer(Base):
    __tablename__ = "memory_layer"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    memory_id = Column(UUID(as_uuid=True), ForeignKey("memory.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("app_user.id"), nullable=False)
    kind = Column(String, CheckConstraint("kind in ('TEXT','IMAGE','VIDEO','AUDIO','REFLECTION','LINK')"), nullable=False)
    text_content = Column(Text, nullable=True)
    meta = Column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)
    artifact_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("now()"))


class Artifact(Base):
    __tablename__ = "artifact"

    id = Column(UUID(as_uuid=True), primary_key=True)
    memory_id = Column(UUID(as_uuid=True), ForeignKey("memory.id", ondelete="CASCADE"), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("app_user.id"), nullable=False)
    mime = Column(Text, nullable=False)
    storage_key = Column(Text, nullable=False)
    sha256 = Column(Text, nullable=False)
    bytes = Column(BigInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text("now()"))


class IdempotencyKey(Base):
    __tablename__ = "idempotency_key"

    user_id = Column(UUID(as_uuid=True), ForeignKey("app_user.id"), primary_key=True)
    endpoint = Column(Text, primary_key=True)
    key = Column(Text, primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=text("now()"))
    resource_id = Column(UUID(as_uuid=True), nullable=True)


class MemoryCoreVersion(Base):
    __tablename__ = "memory_core_version"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    memory_id = Column(UUID(as_uuid=True), ForeignKey("memory.id", ondelete="CASCADE"), primary_key=False, nullable=False)
    version = Column(Integer, nullable=False)
    narrative = Column(Text, nullable=False)
    anchors = Column(JSONB, server_default=text("'[]'::jsonb"), nullable=False)
    people = Column(JSONB, server_default=text("'[]'::jsonb"), nullable=False)
    when = Column(TSTZRANGE, nullable=True)
    where = Column(Text, nullable=True)
    locked = Column(Boolean, nullable=False, server_default=text("false"))
    created_by = Column(UUID(as_uuid=True), ForeignKey("app_user.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text("now()"))
    locked_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint('memory_id', 'version', name='memory_core_version_memory_id_version_key'),
    )
