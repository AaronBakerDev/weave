# Weave: Python FastAPI Scaffolding
# Event-sourced memory service with hybrid search + moderation
#
# File structure:
# apps/python-backend/
#   ├── app/
#   │   ├── main.py              (this file - entry point)
#   │   ├── models/
#   │   │   ├── memory.py        (SQLAlchemy ORM + Pydantic schemas)
#   │   │   └── search.py        (hybrid search logic)
#   │   ├── services/
#   │   │   ├── memory_service.py
#   │   │   ├── search_service.py
#   │   │   └── moderation_service.py
#   │   ├── api/
#   │   │   ├── routers/
#   │   │   │   ├── memories.py      # POST /tools/create_memory, etc.
#   │   │   │   ├── search.py        # POST /tools/search_associative
#   │   │   │   ├── edges.py         # POST /tools/weave
#   │   │   │   └── permissions.py   # POST /tools/set_permissions
#   │   │   └── middleware.py
#   │   ├── db/
#   │   │   ├── models.py            (SQLAlchemy declarative)
#   │   │   └── session.py           (connection pooling)
#   │   └── config.py
#   ├── requirements.txt
#   ├── .env.example
#   └── docker-compose.yml

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import datetime
import os

# ============================================================================
# CONFIG
# ============================================================================

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/weave")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
S3_BUCKET = os.getenv("S3_BUCKET", "weave-memories")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="Weave Memory Service",
    version="0.1.0",
    description="Event-sourced memory platform with associative recall"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://*.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# DATABASE SETUP
# ============================================================================

engine = create_async_engine(
    DATABASE_URL,
    echo=ENVIRONMENT == "development",
    pool_size=20,
    max_overflow=0,
)

SessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db() -> AsyncSession:
    """Dependency: get database session"""
    async with SessionLocal() as session:
        yield session

# ============================================================================
# AUTH HELPER
# ============================================================================

async def get_current_user_id(
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_db)
) -> uuid.UUID:
    """Extract user ID from Bearer token (JWT or opaque token)"""
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
    anchors: List[dict]  # [{"sense": "light", "detail": "..."}, ...]
    people: List[str] = []
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
    filters: Optional[dict] = None  # people, place, emotion, since, visibility

# Response schemas
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
    db: AsyncSession = Depends(get_db)
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
            "status": "draft"
        },
        "ui_component": {
            "type": "MemoryCard",
            "props": {
                "memory_id": str(new_memory_id),
                "title": request.title or "Untitled"
            }
        }
    }

@app.post("/tools/set_core")
async def set_core_tool(
    memory_id: uuid.UUID,
    request: MemoryCoreRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
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
            "locked": True
        }
    }

@app.post("/tools/append_layer")
async def append_layer_tool(
    memory_id: uuid.UUID,
    request: MemoryLayerRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
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
            "visibility": request.visibility
        }
    }

@app.post("/tools/search_associative")
async def search_associative_tool(
    request: SearchRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
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
                    "layer_count": 3
                }
            ],
            "total": 1
        }
    }

@app.post("/tools/weave")
async def weave_tool(
    request: EdgeCreateRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
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
            "strength": 0.75
        }
    }

@app.post("/tools/set_permissions")
async def set_permissions_tool(
    memory_id: uuid.UUID,
    participants: List[dict],  # [{"user_handle": "...", "role": "CONTRIBUTOR"}, ...]
    visibility: str,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
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
            "participant_count": len(participants)
        }
    }

# ============================================================================
# HEALTH CHECK & UTILITY
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check for deployment/orchestration"""
    return {"status": "ok", "service": "weave-memory-api"}

@app.on_event("startup")
async def startup():
    """Initialize database on startup"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.on_event("shutdown")
async def shutdown():
    """Close connections on shutdown"""
    await engine.dispose()

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return {
        "error": exc.detail,
        "status_code": exc.status_code
    }

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=ENVIRONMENT == "development"
    )
