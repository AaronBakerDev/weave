# Weave API Quick Start Guide

## Prerequisites

- Python 3.10+
- PostgreSQL with pgvector extension
- OpenAI API key (for embeddings)

## Setup

### 1. Install Dependencies

```bash
cd /Users/aaronbaker/weave/services/api
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/weave
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Optional (defaults provided)
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIM=1536
JWT_AUDIENCE=weave
JWT_ISSUER=https://auth.example.com/
JWT_JWKS_URL=https://auth.example.com/.well-known/jwks.json
```

### 3. Database Setup

Ensure your PostgreSQL database has:
- pgvector extension installed
- All migrations applied (see migrations directory)

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Running the Services

### Terminal 1: API Server

```bash
uvicorn app.main:app --port 8000 --reload
```

The API will be available at `http://localhost:8000`

- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/v1/health

### Terminal 2: Indexing Worker

```bash
python app/workers/indexing.py
```

You should see:
```
INFO - === Indexing worker started ===
INFO - Configuration: MODEL=text-embedding-3-small, EMBEDDING_DIM=1536
INFO - OpenAI API key configured - using real embeddings
INFO - Database connection established
```

### Terminal 3: Run Tests (Optional)

```bash
python test_endpoints.py
```

Expected output:
```
============================================================
Starting Weave API Tests
============================================================
ℹ️ Testing health endpoint...
✅ Health check passed
ℹ️ Creating a new memory...
✅ Memory created
...
✅ All tests passed successfully!
============================================================
```

## Basic API Usage

### Create a Memory

```bash
curl -X POST http://localhost:8000/v1/memories \
  -H "Content-Type: application/json" \
  -H "X-Debug-User: 11111111-1111-1111-1111-111111111111" \
  -d '{
    "title": "Trip to Cedar Point",
    "visibility": "PRIVATE",
    "seed_text": "Had an amazing day at the amusement park!"
  }'
```

Response:
```json
{
  "id": "a1b2c3d4-...",
  "title": "Trip to Cedar Point",
  "visibility": "PRIVATE",
  "created_at": "2025-10-20T23:12:45Z"
}
```

### Set Core Narrative

```bash
curl -X PUT http://localhost:8000/v1/memories/{memory_id}/core \
  -H "Content-Type: application/json" \
  -H "X-Debug-User: 11111111-1111-1111-1111-111111111111" \
  -d '{
    "narrative": "A thrilling day at Cedar Point with family.",
    "anchors": ["first visit", "summer"],
    "people": ["Dad", "Mom"],
    "where": "Cedar Point, Ohio"
  }'
```

### Lock Core (Triggers Indexing)

```bash
curl -X POST http://localhost:8000/v1/memories/{memory_id}/lock \
  -H "X-Debug-User: 11111111-1111-1111-1111-111111111111"
```

Watch the indexing worker terminal - you'll see it process the event!

### Append a Layer

```bash
curl -X POST http://localhost:8000/v1/memories/{memory_id}/layers \
  -H "Content-Type: application/json" \
  -H "X-Debug-User: 11111111-1111-1111-1111-111111111111" \
  -d '{
    "kind": "TEXT",
    "text_content": "The Millennium Force was incredible!"
  }'
```

### Search Memories

```bash
curl "http://localhost:8000/v1/search/associative?q=cedar%20point&limit=10" \
  -H "X-Debug-User: 11111111-1111-1111-1111-111111111111"
```

Response:
```json
{
  "query": "cedar point",
  "results": [
    {
      "memory": {
        "id": "a1b2c3d4-...",
        "title": "Trip to Cedar Point",
        "visibility": "PRIVATE",
        "created_at": "2025-10-20T23:12:45Z"
      },
      "score": 0.85,
      "reasons": [
        "exact match: 'cedar point'",
        "strong semantic similarity",
        "text relevance"
      ]
    }
  ]
}
```

### Get Memory Details

```bash
curl http://localhost:8000/v1/memories/{memory_id} \
  -H "X-Debug-User: 11111111-1111-1111-1111-111111111111"
```

Response includes:
- Core narrative with locked status
- All layers
- Participants
- Edge summary (connections to other memories)

## Authentication

### Development Mode

Use the `X-Debug-User` header with any UUID:

```bash
X-Debug-User: 11111111-1111-1111-1111-111111111111
```

### Production Mode

Use JWT Bearer token:

```bash
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

The token will be verified against your configured JWKS endpoint.

## Monitoring

### Check Indexing Queue Depth

```sql
SELECT count(*) FROM memory_event;
```

Should be 0 or low if worker is running.

### Check Memory Index Status

```sql
SELECT
  id,
  title,
  CASE WHEN embedding IS NOT NULL THEN 'indexed' ELSE 'not indexed' END as status
FROM memory
LIMIT 10;
```

### API Logs

The API logs all requests with duration:

```
INFO - method=POST path=/v1/memories status=200 dur_ms=45
```

## Troubleshooting

### Issue: Indexing worker not processing events

**Check:**
1. Is the worker running? `ps aux | grep indexing.py`
2. Database connection: Check DATABASE_URL in .env
3. OpenAI API key: Check OPENAI_API_KEY in .env
4. Queue depth: `SELECT count(*) FROM memory_event;`

### Issue: Search returns no results

**Check:**
1. Is indexing worker running?
2. Have memories been indexed? Check `embedding IS NOT NULL` in memory table
3. Wait a few seconds after creating/locking a memory for indexing to complete

### Issue: JWT authentication fails

**Check:**
1. JWT_JWKS_URL is accessible
2. Token is not expired
3. Token audience and issuer match configuration
4. Use X-Debug-User header for development/testing

## File Structure

```
services/api/
├── app/
│   ├── auth/
│   │   └── jwt.py           # JWT verification
│   ├── db/
│   │   ├── models_orm.py    # SQLAlchemy models
│   │   └── session.py       # Database session
│   ├── routers/
│   │   ├── memories.py      # Memory CRUD
│   │   ├── search.py        # Search endpoints
│   │   ├── export.py        # Export endpoint
│   │   └── ...
│   ├── workers/
│   │   └── indexing.py      # Indexing worker
│   ├── models.py            # Pydantic models
│   ├── deps.py              # Dependencies
│   └── main.py              # FastAPI app
├── tests/
│   └── test_api.py          # Unit tests
├── test_endpoints.py        # Integration tests
├── requirements.txt
├── .env.example
└── README.md
```

## Key Concepts

### Memory Lifecycle

1. **Created** - Memory exists with optional seed text
2. **Core Draft** - Core narrative set but not locked
3. **Core Locked** - Core is finalized, indexing triggered
4. **Layers Added** - Text, reflections, media added over time
5. **Indexed** - Full-text and vector search available

### Search Modes

- **Associative Search**: Hybrid search combining:
  - 55% vector similarity (semantic)
  - 35% full-text search (keyword)
  - 10% edge boost (graph connections - placeholder)

### Indexing Document

For each memory, the indexing worker builds a document from:
- Memory title
- Locked core narrative
- Last 5 text/reflection layers
- Artifact captions (from meta.caption)

This document is then:
- Converted to `tsvector` for full-text search
- Embedded via OpenAI API for vector search

## Performance Tips

1. **Batch Operations**: Create multiple memories, then lock cores in batch
2. **Idempotency**: Use `Idempotency-Key` header for safe retries
3. **Caching**: GET requests can be cached (no auth required for public memories)
4. **Pagination**: Use limit parameter on search (default: 20, max: 50)

## Next Steps

- Explore the full API documentation at http://localhost:8000/docs
- Read IMPLEMENTATION.md for architecture details
- Run test_endpoints.py to see the complete flow
- Check SUMMARY.md for implementation details

---

**Questions?** Check the documentation files:
- `IMPLEMENTATION.md` - Detailed technical documentation
- `SUMMARY.md` - Implementation summary
- `test_endpoints.py` - Complete usage examples
