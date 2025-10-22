# Weave: Technical Specification
## Building a ChatGPT‑Native Memory Platform

---

## 0) What the platform gives us (and how Weave should fit)

* **Native app execution.** Using Vercel's approach, Next.js runs natively inside ChatGPT's sandbox (not iframed externally). ChatGPT owns the chrome and composer; Weave owns the UI components and logic. ([Vercel Blog][1b])
* **Surfaces.** ChatGPT can display **inline cards** (compact, in-chat) and **fullscreen** views (expanded canvas)—all managed via React Server Components. ([Vercel Changelog][1c])
* **Discovery & invocation.** Apps can be **suggested by the model** when relevant ("weaver" shows up when the user is narrating a memory) or explicitly invoked by name ("Weave, add this to my Lisbon memory"). ([OpenAI][2])
* **Model Context Protocol (MCP).** Your Next.js app exposes **Tools** (actions the model invokes) and **Resources** (UI components rendered in ChatGPT). Tools link to components via `openai/outputTemplate`. ([OpenAI Developers][3])
* **Connector registration.** You register your app endpoint in ChatGPT settings; no OAuth needed for MVP (auth handled via session context). Users are identified by their ChatGPT session. ([Vercel Changelog][1c])
* **ChatGPT memory (context hints).** ChatGPT can remember user preferences and surface your app contextually, but **do not** rely on it for canonical storage; treat it as hints for recall and suggestions. ([OpenAI][6])

---

## 1) Product surfaces (ChatGPT-first)

### A. Inline "Weaver" card (default entry)

* Appears when users are already in an intimate chat: *"Add this to my New York summer memory"*.
* Card shows: resolve/create memory, pick visibility (solo/shared/public), quick add of text/audio/photo.
* Primary CTAs: **Add** / **Open Canvas** (no more than two, per guidelines). ([OpenAI Developers][1])

### B. Fullscreen "Canvas" (explorable memory space)

* **Organized, interactive canvas** where memories cluster by connection (people, places, emotions, time).
* Layout is **intentional and aesthetic** but interactive: users can **pan, zoom, and move** memories to organize how they remember.
* **Visual threads** show connections between related memories; hover or follow to see relationships.
* **Click/tap a memory** → camera zooms smoothly into detail view (no page nav, feels like entering the space).
* **Filters & search** (voice or text): *"Show me the last time I felt this calm"* highlights relevant memories on the canvas.
* Composer stays active so users can add layers or ask questions while exploring. ([OpenAI Developers][1])

### C. Detail view (zoom-to-enter)

* When you enter a memory from the canvas, the view shows:
  * **Core** (original moment) at the center
  * **Layers** (reflections, artifacts, contributions) arranged around it
  * **Connection threads** showing related memories you can jump to
  * Full editing, sharing, and linking tools
* **Back button** or voice "back" zooms out smoothly to the canvas

### D. Background invocation

* Weave is suggested by ChatGPT when a user is narrating something that looks like a "memory" (Apps are model‑suggested based on context). ([OpenAI][2])

---

## 2) System architecture (clean, boring, reliable)

### Front of house (Vercel's Next.js ChatGPT Apps Starter)

* **Fork Vercel's ChatGPT Apps Next.js starter** as the baseline; it pre-patches the sandbox quirks (asset loading, CORS, history, fetch rewriting, external links).
* **React Server Components** (RSC) handle all UI: inline cards, fullscreen Canvas (explorable memory space)
* **Browser patches** included automatically (no custom shimming needed)
* **Apps SDK hooks** (`useSendMessage`, `useWidgetProps`, `useDisplayMode`) for display modes and chat integration
* **MCP endpoint** at `/api/mcp` exposes Tools; forwarded via Node shim to Python backend
* **Deployed on Vercel** for previews, instant rollback, production stability

### Middle tier (Node.js MCP Shim)

* **Thin Node.js server** inside Vercel, handles MCP protocol and forwards to Python
* Translates tool calls (create_memory, append_layer, etc.) → REST/gRPC to Python API
* Returns tool results + inline HTML/components for UI rendering
* Keeps all business logic in Python; Node is just a protocol bridge

### Back of house (Python + FastAPI system of record)

* **Gateway/API** (FastAPI): OAuth2, rate‑limit, audit, all memory operations.
* **Memory Service** (event‑sourced):
  * `MemoryCore` (immutable), `MemoryLayer` (append‑only), `Edge` (graph), `Participant` (roles).
* **Search Service** (hybrid): Postgres + **pgvector** for embeddings; BM25 for lexical; hybrid ranking for recall. ([OpenAI Platform][8])
* **Media Service**: object storage (S3), signed URLs, image captions, thumbnails.
* **Moderation/Policy**: OpenAI Moderations API + heuristics for sensitive flows. ([OpenAI Platform][9])
* **Analytics/Events**: product telemetry (privacy‑safe).
* **Admin/Trust**: review queue, export/delete tooling.

### Data stores

* **Postgres** (RLS on tenant/user), **pgvector** for embeddings, **Redis** for session/queues, **S3** for media.

### Models

* **Main reasoning**: `gpt‑4o`/`gpt‑4o‑mini` (fast/cheap tiers) or `GPT‑5` for heavier reflection
* **Embeddings**: `text‑embedding‑3‑large`/`small`
* **Transcription**: `gpt‑4o‑transcribe`; **TTS**: `gpt‑4o‑mini‑tts` (for future voice layers)

---

## 2.5) Using Vercel's ChatGPT Apps Starter (don't hand-roll)

**Key insight:** Vercel's starter already solves the hard problem—ChatGPT's triple-iframe sandbox breaks asset loading, relative URLs, history, fetch, CORS, and external links. Vercel patched all of it. We fork their starter and add our custom Weave UI on top, rather than rebuild from scratch.

### Why the starter saves weeks

* **7 browser patches pre-applied** (assetPrefix, `<base>` href, history interception, fetch rewriting, CORS middleware, MutationObserver, external link handling)
* **React Server Components work normally** inside ChatGPT (no custom streaming plumbing)
* **Apps SDK hooks built in** (`useDisplayMode()`, `useSendMessage()`, `useWidgetProps()`)
* **Vercel CI/CD out of the box** (preview deployments, instant rollback, branch URLs)
* **Platform-aligned** (Vercel explicitly blessing this pattern)

### Mono-repo structure (Next.js frontend + Node shim + Python backend)

```
weave/
├── apps/
│   ├── next-app/                    # Fork of Vercel's ChatGPT Apps starter
│   │   ├── app/
│   │   │   ├── layout.tsx           # Browser patches + Apps SDK hooks
│   │   │   ├── page.tsx             # Testing/standalone page
│   │   │   ├── memory/
│   │   │   │   ├── canvas.tsx       # Canvas (explorable memory space with zoom-to-enter)
│   │   │   │   ├── detail.tsx       # Detail view (inside a memory)
│   │   │   │   └── search.tsx       # Search/filter UI component
│   │   │   ├── api/
│   │   │   │   ├── mcp/
│   │   │   │   │   └── route.ts     # MCP handler (Node shim)
│   │   │   │   └── [...other routes handled by shim]
│   │   │   └── lib/
│   │   │       ├── hooks.ts         # useSendMessage, useDisplayMode, etc.
│   │   │       └── ui/
│   │   │           ├── weaver-card.tsx  # Inline "Add to memory" card
│   │   │           ├── canvas.tsx       # Canvas (memory clusters with zoom-to-enter)
│   │   │           ├── memory-detail.tsx # Detail view (Core + Layers)
│   │   │           └── search-ui.tsx    # Filter/search overlay
│   │   ├── next.config.ts           # assetPrefix, experimental RSC, etc.
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── python-backend/              # System of record
│       ├── app/
│       │   ├── main.py              # FastAPI entry point
│       │   ├── models/
│       │   │   ├── memory.py        # MemoryCore, MemoryLayer, Edge, Participant
│       │   │   └── search.py        # Hybrid search (embeddings + BM25)
│       │   ├── services/
│       │   │   ├── memory_service.py
│       │   │   ├── search_service.py
│       │   │   ├── media_service.py
│       │   │   └── moderation_service.py
│       │   ├── api/
│       │   │   ├── routers/
│       │   │   │   ├── memories.py      # /memories/{id}, POST, GET
│       │   │   │   ├── search.py        # /search/associative
│       │   │   │   ├── permissions.py   # /permissions, /invite
│       │   │   │   └── edges.py         # /weave
│       │   │   └── middleware.py
│       │   └── db/
│       │       └── models.py            # SQLAlchemy ORM
│       ├── requirements.txt
│       ├── .env.example
│       └── README.md
│
└── packages/
    ├── mcp-shim/                    # Node.js MCP handler (bridges to Python)
        ├── src/
        │   ├── mcp-handler.ts       # MCP protocol + tool forwarding
        │   └── python-client.ts     # HTTP client to Python API
        ├── package.json
        └── tsconfig.json
```

This is deployed as:
- **Next.js app on Vercel** (includes the MCP handler at `/api/mcp`)
- **Python backend** on Fly.io / Heroku / your own infra
- **Shim forwards** tool calls from ChatGPT → Python REST API → logic/state → back to shim → rendered in Next.js

### React Hooks for Integration

The Apps SDK provides type-safe hooks:

```typescript
// Send a followup message to ChatGPT
const { sendMessage } = useSendMessage();
await sendMessage("I've added this to your memory");

// Access tool output data (passed from MCP tool invocation)
const toolData = useWidgetProps<{ memory_id: string; title: string }>();

// Customize UI based on display context (inline card vs. fullscreen)
const displayMode = useDisplayMode();
if (displayMode === 'fullscreen') {
  // Render Canvas (explorable memory space with zoom-to-enter)
} else {
  // Render compact Weaver card
}
```

### MCP Integration Pattern (Node Shim → Python Backend)

**Flow:** ChatGPT calls tool → Node shim at `/api/mcp` → forwards to Python FastAPI → logic executes → response returned to shim → rendered in Next.js UI

**Node shim handler** (`apps/next-app/app/api/mcp/route.ts`):

```typescript
// MCP protocol handler—ChatGPT talks to this
export async function POST(req: Request) {
  const { jsonrpc, method, params, id } = await req.json();

  if (method === "call_tool") {
    const { name, arguments: args } = params;

    // Forward to Python backend
    const response = await fetch(
      `${process.env.PYTHON_API_BASE}/tools/${name}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      }
    );

    const result = await response.json();

    // Return MCP-formatted response with UI component
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        result: {
          content: result.content,  // structured data
          component: result.ui_component,  // React component to render
        },
      })
    );
  }
}
```

**Python FastAPI tool handler** (`apps/python-backend/app/api/routers/memories.py`):

```python
from fastapi import APIRouter, Depends
from app.services.memory_service import MemoryService
from app.models.memory import MemoryCore, MemoryLayer

router = APIRouter(prefix="/tools", tags=["tools"])

@router.post("/create_memory")
async def create_memory(title: str, seed_text: str, visibility: str, service: MemoryService = Depends()):
    """Tool handler: create a new memory"""
    memory = await service.create_memory(
        title=title,
        seed_text=seed_text,
        visibility=visibility,
        owner_id=get_current_user_id(),  # from JWT context
    )

    return {
        "content": {
            "memory_id": str(memory.id),
            "title": memory.title,
            "status": "created",
        },
        "ui_component": {
            "type": "MemoryCard",
            "props": {"memory_id": str(memory.id), "title": memory.title},
        },
    }
```

**Why this split:**
- Node shim is **stateless** and **thin** (just MCP protocol translation + HTTP)
- Python backend is **stateful** and **authoritative** (all logic, database, events)
- If Python API is slow/down, shim can fast-fail gracefully
- Easy to scale Python independently from UI

### Deployment

**Next.js + Node Shim on Vercel:**
1. Connect GitHub repo to Vercel (auto-detects Next.js)
2. Set env vars: `PYTHON_API_BASE=https://your-python-api.fly.io`, `OPENAI_API_KEY`, etc.
3. Deploy: Vercel builds and deploys to `https://your-weave.vercel.app`
4. MCP endpoint lives at `https://your-weave.vercel.app/api/mcp`

**Python Backend on separate infra** (Fly.io, Heroku, your VPS):
1. Deploy Python FastAPI app (see `apps/python-backend/README.md`)
2. Configure database: `DATABASE_URL=postgresql://...`
3. Python listens at `https://your-python-api.fly.io` (or internal if on same VPC)
4. Environment: `OPENAI_API_KEY`, `S3_BUCKET`, `REDIS_URL`, etc.

**Local Development:**

```bash
# Terminal 1: Python backend
cd apps/python-backend
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Next.js + Node shim (with Python URL)
cd apps/next-app
PYTHON_API_BASE=http://localhost:8000 npm run dev

# Terminal 3: Expose locally via ngrok (for ChatGPT Dev Mode)
ngrok http 3000

# Terminal 4: Register connector in ChatGPT Settings
# → Settings → Connectors → Create
# → Endpoint: https://[ngrok-id].ngrok.io/api/mcp
```

### Stack Decisions (Locked)

* **Frontend**: Next.js + React + TypeScript (Vercel's ChatGPT Apps starter)
* **UI Bridge**: Node.js shim (thin MCP handler only)
* **Backend**: Python 3.11+ (FastAPI, SQLAlchemy, Pydantic)
* **Database**: Postgres 14+ with pgvector extension (RLS enabled)
* **Media**: S3 (signed URLs, 24h TTL)
* **Deployment**:
  - **Frontend**: Vercel (auto-previews, instant rollback)
  - **Backend**: Fly.io or your infra (Docker-ready)

---

## 3) Domain model (minimal but future‑proof)

```sql
User(
  id UUID PRIMARY KEY,
  handle TEXT UNIQUE,
  plan ENUM[FREE|PRO|ENTERPRISE],
  created_at TIMESTAMP,
  deleted_at TIMESTAMP
)

Memory(
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES User(id),
  visibility ENUM[PRIVATE|SHARED|PUBLIC],
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  status ENUM[DRAFT|LOCKED|ARCHIVED]
)

MemoryCore(
  memory_id UUID PRIMARY KEY REFERENCES Memory(id),
  title TEXT,
  when TIMESTAMP,
  where TEXT,
  people TEXT[],
  narrative TEXT,
  anchors JSON[],  -- [{"sense": "light", "detail": "..."}, ...]
  locked_at TIMESTAMP,
  version INT,
  created_at TIMESTAMP
)

MemoryLayer(
  id UUID PRIMARY KEY,
  memory_id UUID REFERENCES Memory(id),
  author_id UUID REFERENCES User(id),
  kind ENUM[TEXT|AUDIO|IMAGE|VIDEO|REFLECTION|LINK],
  payload_uri TEXT,  -- S3 URL or JSON blob
  payload_json JSON,
  created_at TIMESTAMP,
  visibility ENUM[PRIVATE|SHARED|PUBLIC]
)

Edge(
  id UUID PRIMARY KEY,
  a_memory_id UUID REFERENCES Memory(id),
  b_memory_id UUID REFERENCES Memory(id),
  relation ENUM[SAME_PERSON|SAME_EVENT|THEME|EMOTION|TIME_NEAR],
  strength FLOAT,  -- 0.0 to 1.0
  created_by UUID REFERENCES User(id),
  created_at TIMESTAMP
)

Participant(
  id UUID PRIMARY KEY,
  memory_id UUID REFERENCES Memory(id),
  user_id UUID REFERENCES User(id),
  role ENUM[OWNER|CONTRIBUTOR|VIEWER],
  invited_by UUID REFERENCES User(id),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP
)

Artifact(
  id UUID PRIMARY KEY,
  memory_id UUID REFERENCES Memory(id),
  type ENUM[IMAGE|AUDIO|VIDEO|DOCUMENT|TRANSCRIPT],
  uri TEXT,  -- S3 or external URL
  sha256 TEXT,
  mime_type TEXT,
  transcript_uri TEXT,  -- for audio/video
  caption TEXT,
  created_at TIMESTAMP,
  metadata JSON
)

Moderation(
  id UUID PRIMARY KEY,
  subject_type ENUM[MEMORY|LAYER|EDGE],
  subject_id UUID,
  status ENUM[PENDING|APPROVED|FLAGGED|BLOCKED],
  reasons TEXT[],
  reviewed_by UUID REFERENCES User(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP
)

Embedding(
  id UUID PRIMARY KEY,
  subject_type ENUM[MEMORY_CORE|ARTIFACT_TRANSCRIPT|ARTIFACT_CAPTION],
  subject_id UUID,
  embedding VECTOR(3072),  -- text-embedding-3-large
  text_chunk TEXT,  -- for context
  created_at TIMESTAMP,
  model TEXT  -- e.g., 'text-embedding-3-large'
)
```

* **Event sourcing** ensures Core immutability + clear history; edits require a "lift flag" (new core version).
* **Edges** are how "weaving" works—never merging objects, always linking.
* **RLS policies** in Postgres ensure users see only their own and shared memories.

---

## 4) Tool/API contract (what the MCP server exposes)

**Note:** These tools are **implemented in Python** (as FastAPI routes in `apps/python-backend/app/api/routers/`) and **exposed through the Node shim** (MCP handler at `/api/mcp`). The shim translates ChatGPT tool calls → HTTP POST to Python → returns structured results.

### Tools (stable names; simple args; idempotency where possible)

#### Memory Creation & Management

```
create_memory(
  title: string (optional),
  seed_text: string (optional),
  visibility: enum[PRIVATE|SHARED|PUBLIC] = PRIVATE
) -> {
  memory_id: UUID,
  status: "draft"
}
```

```
set_core(
  memory_id: UUID,
  narrative: string,
  anchors: [
    { sense: string, detail: string },
    ...
  ],
  people: string[],
  when: ISO8601 timestamp,
  where: string
) -> {
  core_version: int,
  locked: bool
}
```

```
lock_core(
  memory_id: UUID
) -> {
  locked_at: timestamp,
  immutable: true
}
```

#### Layers & Media

```
append_layer(
  memory_id: UUID,
  kind: enum[TEXT|AUDIO|IMAGE|VIDEO|REFLECTION|LINK],
  payload: string | { ref: s3_url } | { content: base64 }
) -> {
  layer_id: UUID,
  visibility: string
}
```

#### Search & Recall

```
search_associative(
  query: string,
  filters: {
    people?: string[],
    place?: string,
    emotion?: string[],
    since?: timestamp,
    visibility?: enum[PRIVATE|SHARED|PUBLIC]
  }
) -> {
  memories: [
    {
      memory_id: UUID,
      title: string,
      excerpt: string,
      score: float,
      last_opened: timestamp,
      layer_count: int
    },
    ...
  ],
  total: int
}
```

#### Weaving

```
weave(
  a_id: UUID,
  b_id: UUID,
  relation: enum[SAME_PERSON|SAME_EVENT|THEME|EMOTION|TIME_NEAR],
  note: string (optional)
) -> {
  edge_id: UUID,
  strength: float
}
```

#### Permissions & Sharing

```
set_permissions(
  memory_id: UUID,
  participants: [
    { user_handle: string, role: enum[OWNER|CONTRIBUTOR|VIEWER] },
    ...
  ],
  visibility: enum[PRIVATE|SHARED|PUBLIC]
) -> {
  updated_at: timestamp,
  participant_count: int
}
```

```
invite(
  memory_id: UUID,
  user_handle_or_email: string,
  role: enum[CONTRIBUTOR|VIEWER]
) -> {
  invite_id: UUID,
  status: "pending"
}
```

### Auth

* OAuth2 + PKCE; register connector in ChatGPT → user consents on first tool call. ([OpenAI Developers][4])
* Each tool call is scoped to the authenticated user; memory access is validated via `Participant` roles.

### Response Format

Tool results include **metadata** for inline rendering:

```json
{
  "tool_result": {
    "memory_id": "...",
    "title": "...",
    "excerpt": "..."
  },
  "component_hint": {
    "type": "inline_card" | "fullscreen" | "timeline",
    "data": { ... }
  },
  "html": "<div>...</div>"  // optional inline HTML
}
```

---

## 5) Intelligence layer (how recall feels human)

### Associative Recall

Build a single hybrid retriever:

```
score = α * cosine(embedding_q, embedding_m)
      + β * BM25(q, m)
      + γ * edge_boost(q, m)
      + δ * recency_boost(m)
```

Where:
- `α = 0.5`, `β = 0.3`, `γ = 0.15`, `δ = 0.05`
- Embed: Core narrative, transcripts, captions, anchor terms, people/place names. ([OpenAI Platform][8])
- BM25 on full text; re-rank with cross-encoder if needed.

### Emotion & Motif Tagging

* Zero‑shot label with `gpt‑4o‑mini`: emotions (joy, grief, wonder, etc.), motifs (water, loss, return, etc.)
* Persist tags in `MemoryCore.metadata`; refresh lazily on new layers.

### Weaving Suggestions

* On each append, compute overlap with k‑nearest memories (k=5–10).
* Suggest "weave" if `similarity > 0.7` and relation is not already explicit.
* Never auto‑link without user consent.

### Session Guidance (Remembrance)

* Scripted prompts (e.g., "What did you notice first?"), time‑boxed segments (3–5 min).
* "Pause/close" affordances; model guardrails to avoid improvising as a person.
* Moderation on all generated text before surfacing.

---

## 6) Safety, privacy, compliance

### Defaults & Scope

* **Private by default**, explicit scope for shared/public; role‑based access on every tool call.
* Visibility changes are versioned; users can review who saw what, when.

### Moderation

* On publish to shared/public: `openai.Moderations.create()` on narrative, layer text, captions.
* Flags route to human review queue for public memories. ([OpenAI Platform][9])

### Data Rights

* **Export**: JSON + media bundle (downloadable, timestamped).
* **Delete**: cascading soft-delete; archived records for compliance holds.
* **Audit log**: all access, modifications, permission changes; queryable by user.

### PII Minimization

* Embeddings generated on **derived text** (transcripts, captions, tags), not raw media.
* Artifact URIs are signed and time‑bounded (24‑hour default); no persistent public URLs.
* Names stored in `people[]` array—consider hashing or salting for cross-memory privacy.

### Regional Availability

* Apps currently rolling out by region; EU/UK availability follows OpenAI schedule.
* Plan a **graceful degrade**: web mirror (static site) for EU users until Apps available. ([OpenAI][2])

---

## 8) Build order (risk‑down, value‑up)

### Milestone A — Capture & Recall (solo)

**Scope:**
* Inline "Weaver" card → Set/Lock Core → Append layers (text, photo, audio)
* Associative search; Canvas basic view (simple list + timeline, no clustering yet)
* MCP tools: `create_memory`, `set_core`, `lock_core`, `append_layer`, `search_associative`

**Deliverables:**
* Postgres schema (Milestone A tables)
* Python FastAPI core (memory CRUD, search)
* Node MCP shim (tool forwarding)
* Next.js Weaver card + Canvas list view (no clustering yet)
* Vercel deployment + ChatGPT connector registration

**Success criteria:**
- Time to first Core < 2 min
- Search finds expected memories in top 3 results
- 0 permission errors on access control

### Milestone B — Canvas & Weaving Graph

**Scope:**
* Canvas 2D implementation: memory objects, clustering by connection, zoom-to-enter mechanics
* Edge creation + suggestions; visual threads connecting related memories
* Hybrid ranking with edge_boost; layout algorithm (force-directed or grid-based clustering)

**Deliverables:**
* `Edge` table, weave suggestion logic
* `weave()` tool and weave suggestion prompts
* Canvas 2D component with:
  - Memory object rendering (cards or mini-spaces)
  - Pan/zoom navigation
  - Click-to-enter camera animation (zoom into detail view)
  - Visual thread rendering (connections between related memories)
  - Rearrangeable memory objects
  - Filter/search highlighting
* **Success criteria**: Smooth 60fps zoom/pan, weave suggestion acceptance > 40%, memory rearrangement feels responsive

### Milestone C — Sharing

**Scope:**
* Participants/roles, invites, shared editing
* Side‑by‑side perspectives; composite summaries (never replacing originals)

**Deliverables:**
* `Participant` table
* `set_permissions()`, `invite()` tools
* Shared layer append + conflict visualization
* Email invites

**Success criteria:**
- Shared memories gain 2+ contributors on average
- No permission leaks (audit all access)

### Milestone D — Public & Mirror

**Scope:**
* Read‑only web mirror for selected memories; "Open in ChatGPT" deep link
* Public moderation queue

**Deliverables:**
* Static site generator (Next.js) for public memories
* Authentication for exporting private memories
* Moderation dashboard (simple review UI)

---

## 9) KPI & instrumentation

### Capture & Revisit

* `time_to_first_core`: histogram of days to first locked Core
* `% memories with anchors + artifacts`: adoption of sensory details
* `revisit_rate_d7 / d30`: % of memories reopened within 7/30 days
* `avg layers per memory`: depth signal

### Recall

* `search_engagement`: % of searches that result in a click
* `first_result_click_rate`: did user find what they wanted?
* `query_diversity`: ratio of associative (emotion/motif) vs. lexical (name) queries

### Weaving

* `weave_suggestion_impression_rate`: % of suggestions shown
* `weave_suggestion_acceptance_rate`: % of suggestions accepted
* `avg memory degree`: average # of edges per memory

### Sharing

* `shared_memory_adoption`: % of memories that become shared
* `contributors_per_shared_memory`: depth of co-authorship
* `invite_accept_rate`: % of invites that lead to joins

### Safety

* `moderation_flag_rate`: % of public publishes that flag
* `moderation_false_positive_rate`: % of flags overturned on review
* `permission_violation_incidents`: 0 target

### Retention & Growth

* `d1 / d7 / d30 retention`: days active after first Core
* `invite_virality`: % of invites from organic user-to-user shares
* `export_delete_friction`: time-to-complete export/delete flows (should be < 5 min)

---

## 10) Dev notes & ops

### Local Development

* Expose MCP server via **ngrok** or **Cloudflare Tunnel**
* Add connector in ChatGPT Dev Mode
* Use Apps SDK "custom UX" quickstart for live reload

```bash
# Terminal 1: MCP server
npm run dev:mcp

# Terminal 2: Apps SDK UI
npm run dev:ui

# Terminal 3: ngrok tunnel
ngrok http 3001
```

### Cost Control

* Route light tasks to `gpt‑4o‑mini` (~10% cost of gpt-4o)
* Batch embeddings; cache summaries in Redis with TTL
* Stream TTS only when screen is active; pre-buffer audio

### Rate Limits

* OpenAI: backoff + exponential retry; pre‑warm embedding cache on new layers
* Database: connection pool (25–50 idle), query timeouts (5 sec default)
* Realtime: max 50 concurrent sessions per tier; queue excess

### Security

* Token‑bound OAuth (PKCE required)
* Per‑memory scoped access tokens (short‑lived, ~1 hour)
* RLS in Postgres enforced at query layer; no raw SQL
* Signed URLs for media (25‑byte signature, 24‑hour TTL)
* All secrets in environment (rotate weekly)

### Testing

* **Fuzz test search** with adversarial queries (semantic abuse, edge cases)
* **Moderation coverage**: test hard limits (hate speech, abuse, etc.)
* **Permission matrix**: verify all access control paths (owner, contributor, viewer)
* **Embedding quality**: validate associative recall with test memories

### Monitoring

* Logs (structured JSON): MCP server, search queries, session lifecycle, errors
* Metrics: Prometheus-format; Grafana dashboards for KPIs
* Alerts: high error rate (>1%), slow search (>2s p95), database connection pool exhaustion

---

## 11) All foundational choices locked

**Complete stack locked:**

✓ **Frontend**: Vercel's Next.js ChatGPT Apps starter
✓ **UI Bridge**: Node.js MCP shim
✓ **Backend**: Python 3.11+ FastAPI
✓ **Database**: Postgres 14+ with pgvector
✓ **Canvas tech**: Canvas 2D (zoom/pan/rearrange)
✓ **Canvas visual**: **Minimalist cards** (rectangles with title + metadata icons)
✓ **Public mirror**: **Hybrid model** (open canvas browse → auth for connections/actions)

**Canvas card design (Milestone B):**
```
┌─────────────────┐
│  New York '24   │ ← title
│                 │
│ 📍 place 🧑 3   │ ← metadata (location, 3 people)
│ 🟡 emotion 🔗 2 │ ← emotion color, 2 connections
└─────────────────┘
```
- Color-coded by emotion/time/person
- Icons for place, people count, connection count
- Fast to iterate; clean and readable
- Thumbnail upgrade path post-MVP

**Public mirror (Milestone D) — Hybrid model:**
- Anonymous users: browse canvas, read detail views (no auth)
- Connection threads: hidden without login (prevents inference)
- "Sign in to see related memories" CTAs
- Auth unlocks: seeing connection graph, future actions (save, comment, etc.)
- Public memories remain public; no data leaks

---

## Implementation Notes

Now that all choices are locked, we will ship:

1. **Fork Vercel's ChatGPT Apps Next.js starter** (baseline; all sandbox patches pre-applied)
2. **Proposed Postgres schema (DDL)** — SQL with comments, indexes, RLS policies
3. **Python FastAPI scaffolding** — Event-sourced Memory service, Search, API routers
4. **Node MCP shim** — MCP protocol handler that forwards tool calls to Python
5. **React UI components** — Weaver card (inline), Sea (fullscreen), search UI

**Estimated timeline:**
- **Milestone A (capture + recall, solo):** 3–4 weeks
- **Milestone B (weaving + graph):** 2–3 weeks
- **Milestone C (sharing + co-authorship):** 2–3 weeks
- **Milestone D (public mirror):** 2 weeks

Total to feature-complete MVP: **9–13 weeks** with a 2-person team (1 Python backend, 1 frontend/Node shim).

**Why using Vercel's starter saves time:**
- Sandbox quirks already patched (asset loading, CORS, history, fetch, external links)
- RSC and streaming work out of the box
- Apps SDK hooks pre-integrated
- Previews and CI/CD on Vercel—free dev iteration

---

## References

[1b]: https://vercel.com/blog/running-next-js-inside-chatgpt-a-deep-dive-into-native-app-integration "Running Next.js Inside ChatGPT: A Deep Dive"
[1c]: https://vercel.com/changelog/chatgpt-apps-support-on-vercel "ChatGPT Apps Support on Vercel"
[1]: https://developers.openai.com/apps-sdk/concepts/design-guidelines/ "App design guidelines"
[2]: https://openai.com/index/introducing-apps-in-chatgpt/ "Introducing apps in ChatGPT and the new Apps SDK | OpenAI"
[3]: https://developers.openai.com/apps-sdk/?utm_source=chatgpt.com "Apps SDK"
[4]: https://developers.openai.com/apps-sdk/deploy/connect-chatgpt/?utm_source=chatgpt.com "Connect from ChatGPT"
[6]: https://openai.com/index/memory-and-new-controls-for-chatgpt/?utm_source=chatgpt.com "Memory and new controls for ChatGPT"
[7]: https://developers.openai.com/apps-sdk/build/custom-ux/?utm_source=chatgpt.com "Build a custom UX - Apps SDK"
[8]: https://platform.openai.com/docs/guides/embeddings/what-are-embeddings?%3Butm_campaign=airflow-in-action-bam&%3Butm_medium=web&utm_cta=website-homepage-hero-live-demo%3Fwtime&wtime=4s&utm_source=chatgpt.com "Vector embeddings - OpenAI API"
[9]: https://platform.openai.com/docs/api-reference/moderations/object?adobe_mc=MCMID%3D04000893784186094640990814905405683999%7CMCORGID%3DA8833BC75245AF9E0A490D4D%2540AdobeOrg%7CTS%3D1757980800&utm_source=chatgpt.com "API Reference"
[10]: https://platform.openai.com/docs/models/gpt-4o?utm_source=chatgpt.com "Model - OpenAI API"
[11]: https://developers.openai.com/apps-sdk/concepts/mcp-server/?utm_source=chatgpt.com "MCP - Apps SDK"
[12]: https://developers.openai.com/apps-sdk/app-developer-guidelines/?utm_source=chatgpt.com "App developer guidelines"
[13]: https://platform.openai.com/docs/models/gpt-4o-mini?utm_source=chatgpt.com "Model - OpenAI API"
[14]: https://platform.openai.com/docs/guides/rate-limits/overview?utm_source=chatgpt.com "Rate limits - OpenAI API"
