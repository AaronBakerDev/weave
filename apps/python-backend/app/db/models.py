"""
SQLAlchemy ORM Models for Weave

Defines the core data structures for memories, layers, edges, and permissions
"""

from sqlalchemy import (
    Column,
    String,
    DateTime,
    Integer,
    Float,
    Text,
    ARRAY,
    JSON,
    Boolean,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import uuid

Base = declarative_base()


# ============================================================================
# USERS
# ============================================================================


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    handle = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    plan = Column(
        String(20),
        default="FREE",
        nullable=False,
        check=CheckConstraint("plan IN ('FREE', 'PRO', 'ENTERPRISE')"),
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    memories = relationship("Memory", back_populates="owner")
    layers = relationship("MemoryLayer", back_populates="author")
    participants = relationship("Participant", back_populates="user")


# ============================================================================
# MEMORIES (Core entity)
# ============================================================================


class Memory(Base):
    __tablename__ = "memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    visibility = Column(
        String(20),
        default="PRIVATE",
        nullable=False,
        check=CheckConstraint("visibility IN ('PRIVATE', 'SHARED', 'PUBLIC')"),
    )
    status = Column(
        String(20),
        default="DRAFT",
        nullable=False,
        check=CheckConstraint("status IN ('DRAFT', 'LOCKED', 'ARCHIVED')"),
    )
    created_at = Column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    owner = relationship("User", back_populates="memories")
    core = relationship("MemoryCore", back_populates="memory", uselist=False)
    layers = relationship("MemoryLayer", back_populates="memory")
    edges_a = relationship(
        "Edge",
        foreign_keys="Edge.a_memory_id",
        back_populates="memory_a",
    )
    edges_b = relationship(
        "Edge",
        foreign_keys="Edge.b_memory_id",
        back_populates="memory_b",
    )
    participants = relationship("Participant", back_populates="memory")
    artifacts = relationship("Artifact", back_populates="memory")


# ============================================================================
# MEMORY CORE (Immutable snapshot)
# ============================================================================


class MemoryCore(Base):
    __tablename__ = "memory_cores"

    memory_id = Column(
        UUID(as_uuid=True),
        ForeignKey("memories.id", ondelete="CASCADE"),
        primary_key=True,
    )
    title = Column(String(255), nullable=False)
    narrative = Column(Text, nullable=False)
    when = Column(DateTime, nullable=True)
    where = Column(String(255), nullable=True)
    people = Column(ARRAY(String), nullable=True)
    anchors = Column(JSON, nullable=True)  # [{sense, detail}, ...]
    emotion = Column(String(50), nullable=True)  # For color-coding
    locked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    metadata = Column(JSON, nullable=True)

    # Relationships
    memory = relationship("Memory", back_populates="core")


# ============================================================================
# MEMORY LAYERS (Append-only contributions)
# ============================================================================


class MemoryLayer(Base):
    __tablename__ = "memory_layers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    memory_id = Column(
        UUID(as_uuid=True), ForeignKey("memories.id", ondelete="CASCADE"), nullable=False
    )
    author_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    kind = Column(
        String(20),
        nullable=False,
        check=CheckConstraint(
            "kind IN ('TEXT', 'AUDIO', 'IMAGE', 'VIDEO', 'REFLECTION', 'LINK')"
        ),
    )
    payload_uri = Column(String(2048), nullable=True)  # S3 URL
    payload_json = Column(JSON, nullable=True)  # For text/metadata
    visibility = Column(
        String(20),
        default="SHARED",
        check=CheckConstraint("visibility IN ('PRIVATE', 'SHARED', 'PUBLIC')"),
    )
    created_at = Column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )

    # Relationships
    memory = relationship("Memory", back_populates="layers")
    author = relationship("User", back_populates="layers")


# ============================================================================
# MEMORY EDGES (Graph connections)
# ============================================================================


class Edge(Base):
    __tablename__ = "edges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    a_memory_id = Column(
        UUID(as_uuid=True), ForeignKey("memories.id", ondelete="CASCADE"), nullable=False
    )
    b_memory_id = Column(
        UUID(as_uuid=True), ForeignKey("memories.id", ondelete="CASCADE"), nullable=False
    )
    relation = Column(
        String(50),
        nullable=False,
        check=CheckConstraint(
            "relation IN ('SAME_PERSON', 'SAME_PLACE', 'SAME_TIME', 'THEME', 'EMOTION', 'TIME_NEAR')"
        ),
    )
    strength = Column(
        Float,
        default=0.5,
        check=CheckConstraint("strength >= 0.0 AND strength <= 1.0"),
    )
    created_by = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Constraints
    __table_args__ = (
        CheckConstraint("a_memory_id != b_memory_id", name="no_self_edge"),
        UniqueConstraint(
            "relation",
            "created_by",
            name="unique_edge_per_user_and_relation",
        ),
    )

    # Relationships
    memory_a = relationship(
        "Memory",
        foreign_keys=[a_memory_id],
        back_populates="edges_a",
    )
    memory_b = relationship(
        "Memory",
        foreign_keys=[b_memory_id],
        back_populates="edges_b",
    )


# ============================================================================
# PARTICIPANTS (For shared memories)
# ============================================================================


class Participant(Base):
    __tablename__ = "participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    memory_id = Column(
        UUID(as_uuid=True), ForeignKey("memories.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role = Column(
        String(20),
        nullable=False,
        check=CheckConstraint("role IN ('OWNER', 'CONTRIBUTOR', 'VIEWER')"),
    )
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    invited_at = Column(DateTime, default=datetime.utcnow)
    joined_at = Column(DateTime, nullable=True)

    # Unique constraint
    __table_args__ = (UniqueConstraint("memory_id", "user_id"),)

    # Relationships
    memory = relationship("Memory", back_populates="participants")
    user = relationship("User", back_populates="participants")


# ============================================================================
# ARTIFACTS (Media attachments)
# ============================================================================


class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    memory_id = Column(
        UUID(as_uuid=True), ForeignKey("memories.id", ondelete="CASCADE"), nullable=False
    )
    type = Column(
        String(50),
        nullable=False,
        check=CheckConstraint(
            "type IN ('IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'TRANSCRIPT')"
        ),
    )
    uri = Column(String(2048), nullable=False)  # S3 signed URL
    sha256 = Column(String(64), nullable=True)
    mime_type = Column(String(100), nullable=True)
    transcript_uri = Column(String(2048), nullable=True)  # For audio/video
    caption = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    metadata = Column(JSON, nullable=True)

    # Relationships
    memory = relationship("Memory", back_populates="artifacts")


# ============================================================================
# MODERATION
# ============================================================================


class ModerationFlag(Base):
    __tablename__ = "moderation_flags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_type = Column(
        String(20),
        check=CheckConstraint(
            "subject_type IN ('MEMORY', 'LAYER', 'ARTIFACT')"
        ),
    )
    subject_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    status = Column(
        String(20),
        default="PENDING",
        check=CheckConstraint(
            "status IN ('PENDING', 'APPROVED', 'FLAGGED', 'BLOCKED')"
        ),
    )
    reasons = Column(ARRAY(String), nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ============================================================================
# EVENTS (Analytics)
# ============================================================================


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    event_type = Column(String(100), nullable=False, index=True)
    subject_id = Column(UUID(as_uuid=True), nullable=True)
    metadata = Column(JSON, nullable=True)
    created_at = Column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )
