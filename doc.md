# Weave Product Build Guide (v1)

This is the ordered, practical guide to ship Weave v1 (ChatGPT‑native memory platform) with Canvas Option B (richer cards) and Public Mirror Option B (lightweight follows + RSVP later). It is sequenced so each step unblocks the next.

Date: 2025‑10‑21

---

## 0) Foundation & Current State

- Decisions locked
  - ChatGPT‑native UI (Next.js on Vercel) + Node MCP shim → Python FastAPI on Railway.
  - Canvas Option B (richer visual cards); Public Mirror Option B (slugs + follows; events/RSVP later).
- Code present in repo
  - Backend skeleton: `services/api` (FastAPI, SQLAlchemy, RLS, migrations).
  - Implemented endpoints:
    - `POST /v1/memories` (idempotent), `PUT /v1/memories/{id}/core` (draft + lift), `POST /v1/memories/{id}/lock`.
    - `POST /v1/memories/{id}/layers` (TEXT/REFLECTION/MEDIA/LINK + idempotency).
    - `POST /v1/artifacts/upload` (S3/B2 stream) and `GET /v1/artifacts/{id}/download` (signed URL).
  - Not yet implemented: `GET /v1/memories/{id}`, `/permissions`, `/weaves`, `/search/associative`, invites, auth/JWT, indexing pipeline, UI app, MCP route, public mirror.

---

## 1) Milestone A — Capture & Recall (Backend‑first)

Goal: A user can create memories, set/lock a core, add layers, search, and open a memory (detail view payload). Deployed on Railway; UI has Inline Weaver + a simple detail page.

1. Database & Auth Wiring
- Apply migrations in order: `0001_init.sql`, `0002_idempotency.sql`, `0003_core_locked_at.sql`, then `rls.sql`.
- Implement JWT verification in `services/api/app/deps.py:get_user_id` (parse Authorization, validate against `JWT_JWKS_URL`, return subject UUID).
- Ensure DB session sets `SET LOCAL app.user_id` per request (already scaffolded in `db/session.py`).
- Configure CORS from `.env` (`ALLOWED_ORIGINS`).

2. Implement `GET /v1/memories/{id}`
- Return: current core (locked at `memory.current_core_version` or draft if none), layers (ascending by `created_at`), participants, edges summary (counts by relation), and basic artifact descriptors (IDs, mime, bytes).
- Do NOT inline signed URLs; client should call `GET /artifacts/{id}/download` as needed.

3. Indexing Pipeline (worker)
- Replace stub in `services/api/app/workers/indexing.py` with real embedding + tsv rebuild:
  - Add `memory_event` table (or use NOTIFY) to enqueue on core lock and text/reflection layer append.
  - Build `document_text = title + locked core narrative + selected layer texts + captions`.
  - `UPDATE memory SET tsv = to_tsvector('english', document_text), embedding = :vector`.
  - Choose embeddings model (1536 dims) and implement provider call.

4. Implement `GET /v1/search/associative`
- Query pattern: hybrid score = 0.55 * cosine + 0.35 * ts_rank + 0.10 * edge boost.
- Return `{query, results:[{memory, score, reasons}]}`; populate `reasons` (e.g., “term match: cedar”, “edge boost: near Dad”).

5. Observability & Ops
- Add structured JSON logging (request id, user id, route, status) and error handler.
- Add `/v1/health` (present), plus `/v1/ready` if needed.
- Basic rate limiting (per‑IP/per‑user) and payload size limits for uploads.

6. Deploy on Railway
- Use `docs/DEPLOY-RAILWAY.md`. Set env vars, run migrations, verify `/v1/health`.

7. UI (Minimum for A)
- Scaffold `apps/chatgpt-ui` (Next.js Apps starter fork) with `/api/mcp` that proxies to `PYTHON_API_BASE`.
- Inline Weaver card: create memory; set/lock core; append text; show confirmations.
- Simple Memory page (detail): fetch `GET /v1/memories/{id}`, render core + layers; use download endpoint for media.

Acceptance criteria
- P0 endpoints: create, core set/lock, append layer, artifacts upload/download, search, get memory.
- Indexing produces results in <2s p95 on 1k memories.
- Railway deploy green; Vercel UI can create/recall a memory end‑to‑end.

---

## 2) Milestone B — Weaving & Canvas (Option B visuals)

Goal: Link memories, visualize in a canvas with richer cards, and navigate via zoom‑to‑enter.

8. Backend: Weaving
- Implement `POST /v1/weaves` with pair normalization and uniqueness per relation; prevent self‑links.
- Extend `GET /v1/memories/{id}` with connected memories preview (IDs + titles, relation).
- Weave suggestions (MVP): compute overlap on append; return suggestions via a lightweight `GET /v1/memories/{id}/suggestions` or inline on append response.

9. UI: Canvas (Sea)
- Implement Canvas 2D with pan/zoom; render richer cards (thumb, sensory icons, people, when/where badge).
- Threads between related memories; hover preview; click to zoom‑to‑enter.
- Filters: time, person, theme; search highlighting.

10. Performance & UX polish
- Virtualize lists in detail; lazy‑load media; debounce search.
- Persist last camera position per user.

Acceptance criteria
- Create a weave link and see the thread in Canvas; enter/exit memory smoothly.

---

## 3) Milestone C — Sharing, Permissions, Invites (Public Option B groundwork)

Goal: Collaborate on memories with role‑based access; invite flow; begin public presence.

11. Backend: Permissions
- Implement `POST /v1/memories/{id}/permissions` (owner‑only). Upsert `participant` roles, set `visibility`.
- On PUBLIC, ensure `public_memory_slug` exists; on downgrade, revoke.
- Tighten RLS policies for all child tables; ensure contributors can add layers but not change visibility.

12. Backend: Invites
- Implement `POST /v1/invites` and `POST /v1/invites/{token}/accept` with single‑use tokens and expiry.
- Email sending via provider (or manual copy link for MVP).

13. UI: Sharing & Public
- Inline flows to invite by handle/email; show roles.
- Public viewer route by slug (viewer‑only at first); add “follow author” button.
- Basic “Following” feed in UI (server lists public memories by followed authors).

Acceptance criteria
- Invite a user, they accept, and can append a layer; public page resolves via slug.

---

## 4) Milestone D — Public Mirror & Accounts (Option B features)

14. Follows & Profiles
- Implement follows list and public author pages (handle + display name).
- Rate‑limit public endpoints; cache slugs.

15. Optional: Events/RSVP (scaffolded tables)
- If needed in v1.x, add public events backed by `public_event` and `event_rsvp`.

Acceptance criteria
- Public pages render fast (<500ms p95 cached), and follow counts increment.

---

## 5) Security, Privacy, Compliance

16. Data safety
- Consistent “owner as participant” pattern; verify every write path.
- Audit log table for permission changes and visibility flips.
- Content moderation hooks for public content.

17. Secrets & storage
- Rotate keys; bucket policies (private, least privilege); CORS rules restricted to Vercel origin in prod.

18. DSR & lifecycle
- Export/delete flows; tombstone logic; backups and tested restore.

Acceptance criteria
- Permission matrix tests pass; export/delete under 5 minutes; no public data leaks.

---

## 6) Quality, Testing, and Instrumentation

19. Tests
- Unit tests for services (memory, search, weave); API tests for each route; RLS tests for owner/contributor/viewer.
- Fuzz search inputs; large artifact uploads.

20. Metrics & logs
- Request/DB timings; search latency; error rate; indexing lag; weave usage.
- Dashboards + alerts (error rate >1%, search p95 >2s, pool exhaustion).

Acceptance criteria
- CI runs test suite; dashboards show healthy KPIs during dogfood.

---

## 7) Launch Checklist

21. Operational readiness
- On‑call rotation; runbooks; incident comms; status page.
- Budget monitoring for OpenAI, storage, and Railway.

22. Legal & docs
- Privacy policy, Terms, Data Processing Addendum.
- In‑product disclosures: what’s public, what’s shared, how AI assists.

23. Final QA & dry runs
- Create → lock → append → weave → share → public mirror flows verified in staging and prod.

---

## Appendix — Task Index (Do‑First List)

1) Auth: Implement JWT verification in `app/deps.py:get_user_id`.
2) Endpoint: `GET /v1/memories/{id}`.
3) Worker: real embeddings + tsv rebuild; hook events on lock and text layer append.
4) Endpoint: `GET /v1/search/associative`.
5) UI: Inline Weaver (create/core/lock/layer) + minimal detail view.
6) Weaving: `POST /v1/weaves` + Canvas threads; canvas basic implementation.
7) Permissions: `POST /v1/memories/{id}/permissions` + RLS tighten.
8) Invites: create/accept + UI flows.
9) Public mirror: slugs + viewer page + follows.
10) Security/QA: permission matrix tests, export/delete flow, observability.

---

## References (in repo)
- API docs: `docs/API.md`
- Railway deploy: `docs/DEPLOY-RAILWAY.md`
- Backend code: `services/api/...`
- Specs: `specs/product-spec.md`, `specs/technical-spec.md`

