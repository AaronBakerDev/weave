from typing import Literal, List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID

Visibility = Literal['PRIVATE','SHARED','PUBLIC']
Role       = Literal['OWNER','CONTRIBUTOR','VIEWER']
LayerKind  = Literal['TEXT','IMAGE','VIDEO','AUDIO','REFLECTION','LINK']
Relation   = Literal['SAME_PERSON','SAME_EVENT','THEME','EMOTION','TIME_NEAR']


class CreateMemoryReq(BaseModel):
    title: Optional[str] = None
    visibility: Visibility = 'PRIVATE'
    seed_text: Optional[str] = None


class MemoryRef(BaseModel):
    id: UUID
    title: Optional[str] = None
    visibility: Visibility
    created_at: datetime


class SetCoreReq(BaseModel):
    narrative: str
    anchors: List[str] = Field(default_factory=list)
    people: List[str] = Field(default_factory=list)
    when_start: Optional[datetime] = None
    when_end: Optional[datetime] = None
    where: Optional[str] = None
    lift: bool = False  # if true, starts a new draft version when locked exists


class LockCoreResp(BaseModel):
    memory_id: UUID
    version: int
    locked_at: datetime


class AppendLayerReq(BaseModel):
    kind: LayerKind
    text_content: Optional[str] = None
    artifact_id: Optional[UUID] = None
    meta: Dict = Field(default_factory=dict)


class SetPermissionsReq(BaseModel):
    visibility: Visibility
    participants: List[Dict] = Field(default_factory=list)  # [{user_id, role}]


class WeaveReq(BaseModel):
    a_id: UUID
    b_id: UUID
    relation: Relation
    note: Optional[str] = None
    strength: Optional[float] = 0.5


class SearchRespItem(BaseModel):
    memory: MemoryRef
    score: float
    reasons: List[str] = Field(default_factory=list)


class SearchResp(BaseModel):
    query: str
    results: List[SearchRespItem]


# ----- Memory detail response models -----

class CoreOut(BaseModel):
    version: int
    narrative: str
    anchors: List[str]
    people: List[str]
    when_start: Optional[datetime] = None
    when_end: Optional[datetime] = None
    where: Optional[str] = None
    locked: bool = True
    locked_at: Optional[datetime] = None


class ArtifactMeta(BaseModel):
    id: UUID
    mime: str
    bytes: int


class LayerOut(BaseModel):
    id: UUID
    kind: LayerKind
    text_content: Optional[str] = None
    artifact_id: Optional[UUID] = None
    artifact: Optional[ArtifactMeta] = None
    meta: Dict = Field(default_factory=dict)
    author_id: UUID
    created_at: datetime


class ParticipantOut(BaseModel):
    user_id: UUID
    role: Role
    handle: Optional[str] = None
    display_name: Optional[str] = None


class EdgesSummary(BaseModel):
    counts: Dict[str, int] = Field(default_factory=dict)
    connections: List[Dict] = Field(default_factory=list)  # [{memory_id, relation}]


class MemoryDetailResp(BaseModel):
    id: UUID
    title: Optional[str] = None
    visibility: Visibility
    created_at: datetime
    core: Optional[CoreOut] = None
    layers: List[LayerOut] = Field(default_factory=list)
    participants: List[ParticipantOut] = Field(default_factory=list)
    edges_summary: EdgesSummary = Field(default_factory=EdgesSummary)
