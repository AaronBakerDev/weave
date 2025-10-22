"""
Weave FastAPI Backend

Event-sourced memory service with hybrid search + moderation
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import datetime

from app.config import settings
from app.db.session import get_db, init_db, close_db
from app.db.models import Memory, MemoryCore, MemoryLayer, Edge, User, Participant

# ============================================================================
# LIFESPAN EVENTS
# ============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events"""
    # Startup
    print("🚀 Initializing Weave FastAPI backend...")
    await init_db()
    yield
    # Shutdown
    print("🛑 Shutting down...")
    await close_db()


# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="Weave Memory Service",
    version="0.1.0",
    description="Event-sourced memory platform with associative recall",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# AUTH HELPER
# ============================================================================


async def get_current_user_id(
    authorization: Optional[str] = Header(None),
) -> uuid.UUID:
    """Extract user ID from Bearer token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization")

    token = authorization.split(" ")[1]

    # TODO: Validate JWT or token service
    # For now, assume token is a UUID
    try:
        user_id = uuid.UUID(token)
        return user_id
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============================================================================
# PYDANTIC SCHEMAS (Request/Response)
# ============================================================================


class MemoryCreateRequest(BaseModel):
    title: Optional[str] = None
    seed_text: Optional[str] = None
    visibility: str = "PRIVATE"


class MemoryCoreRequest(BaseModel):
    narrative: str
    anchors: List[dict] = Field(default_factory=list)
    people: List[str] = Field(default_factory=list)
    when: Optional[datetime] = None
    where: Optional[str] = None
    emotion: Optional[str] = None


class MemoryLayerRequest(BaseModel):
    kind: str  # TEXT, AUDIO, IMAGE, VIDEO, REFLECTION, LINK
    payload: str  # text content or S3 URI
    visibility: str = "SHARED"


class EdgeCreateRequest(BaseModel):
    a_memory_id: uuid.UUID
    b_memory_id: uuid.UUID
    relation: str  # SAME_PERSON, SAME_PLACE, THEME, EMOTION, TIME_NEAR
    note: Optional[str] = None


class SearchRequest(BaseModel):
    query: str
    filters: Optional[dict] = None


class MemoryResponse(BaseModel):
    memory_id: uuid.UUID
    title: Optional[str]
    owner_id: uuid.UUID
    visibility: str
    created_at: datetime
    status: str


class SearchResult(BaseModel):
    memory_id: uuid.UUID
    title: str
    excerpt: str
    score: float
    last_opened: Optional[datetime]
    layer_count: int


# ============================================================================
# TOOL HANDLERS (Called by MCP shim)
# ============================================================================


@app.post("/tools/create_memory")
async def create_memory_tool(
    request: MemoryCreateRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    MCP Tool: create_memory
    Creates a new draft memory.
    """
    # TODO: Implement memory creation logic
    # 1. INSERT into memories table
    # 2. If seed_text provided, create initial layer
    # 3. Return memory_id + status

    new_memory_id = uuid.uuid4()

    return {
        "content": {
            "memory_id": str(new_memory_id),
            "title": request.title or "Untitled",
            "status": "draft",
        },
        "ui_component": {
            "type": "MemoryCard",
            "props": {
                "memory_id": str(new_memory_id),
                "title": request.title or "Untitled",
            },
        },
    }


@app.post("/tools/set_core")
async def set_core_tool(
    request: MemoryCoreRequest,
    memory_id: uuid.UUID = Header(None, alias="X-Memory-ID"),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    MCP Tool: set_core
    Sets the immutable core snapshot of a memory.
    """
    # TODO: Implement
    # 1. Validate user owns memory
    # 2. INSERT into memory_cores (immutable)
    # 3. Generate embedding for narrative
    # 4. Infer emotion from narrative (gpt-4o-mini)
    # 5. UPDATE memories.status = 'LOCKED'

    return {
        "content": {
            "memory_id": str(memory_id),
            "core_version": 1,
            "locked": True,
        }
    }


@app.post("/tools/append_layer")
async def append_layer_tool(
    request: MemoryLayerRequest,
    memory_id: uuid.UUID = Header(None, alias="X-Memory-ID"),
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    MCP Tool: append_layer
    Adds a new layer (contribution, reflection, artifact) to a memory.
    """
    # TODO: Implement
    # 1. Validate user has permission (owner, contributor)
    # 2. If kind is AUDIO/IMAGE/VIDEO, handle media upload
    # 3. INSERT into memory_layers
    # 4. Generate embedding if TEXT
    # 5. Run moderation if public

    new_layer_id = uuid.uuid4()

    return {
        "content": {
            "layer_id": str(new_layer_id),
            "memory_id": str(memory_id),
            "visibility": request.visibility,
        }
    }


@app.post("/tools/search_associative")
async def search_associative_tool(
    request: SearchRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    MCP Tool: search_associative
    Hybrid search (semantic + lexical + graph) over user's memories.
    """
    # TODO: Implement
    # 1. Embed query with text-embedding-3-large
    # 2. Search memory_cores + memory_layers + artifacts with:
    #    - cosine similarity (semantic)
    #    - BM25 (lexical)
    #    - edge_boost if connected memories
    # 3. Rank by hybrid score
    # 4. Filter by visibility + user permissions
    # 5. Return top 10

    return {
        "content": {
            "memories": [
                {
                    "memory_id": str(uuid.uuid4()),
                    "title": "Example memory",
                    "excerpt": "...",
                    "score": 0.95,
                    "layer_count": 3,
                }
            ],
            "total": 1,
        }
    }


@app.post("/tools/weave")
async def weave_tool(
    request: EdgeCreateRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    MCP Tool: weave
    Create an edge (connection) between two memories.
    """
    # TODO: Implement
    # 1. Validate both memories exist + user can see them
    # 2. Check edge doesn't already exist
    # 3. INSERT into edges
    # 4. Log event

    new_edge_id = uuid.uuid4()

    return {
        "content": {
            "edge_id": str(new_edge_id),
            "relation": request.relation,
            "strength": 0.75,
        }
    }


@app.post("/tools/set_permissions")
async def set_permissions_tool(
    memory_id: uuid.UUID,
    participants: List[dict],
    visibility: str,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    MCP Tool: set_permissions
    Update memory visibility and participant roles.
    """
    # TODO: Implement
    # 1. Validate user is owner
    # 2. UPDATE memories.visibility
    # 3. Upsert rows in participants table
    # 4. Log permission changes

    return {
        "content": {
            "memory_id": str(memory_id),
            "visibility": visibility,
            "participant_count": len(participants),
        }
    }


# ============================================================================
# HEALTH CHECK & UTILITY
# ============================================================================


@app.get("/health")
async def health_check():
    """Health check for deployment/orchestration"""
    return {"status": "ok", "service": "weave-memory-api"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Weave Memory API",
        "version": "0.1.0",
        "docs": "/docs",
    }


# ============================================================================
# ERROR HANDLERS
# ============================================================================


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return {
        "error": exc.detail,
        "status_code": exc.status_code,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
    )
