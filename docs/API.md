# Weave v1 API (Refactored)

Base URL: `/v1`

- `POST /memories` → Create memory shell (optional seed)
- `GET /memories/{id}` → Full memory payload (core+layers+participants+edges summary); layers include artifact descriptors
- `PUT /memories/{id}/core` → Set/replace draft Core (`lift` to start new draft)
- `POST /memories/{id}/lock` → Lock Core (immutable version)
- `POST /memories/{id}/layers` → Append layer (TEXT|IMAGE|VIDEO|AUDIO|REFLECTION|LINK)
- `POST /memories/{id}/permissions` → Set roles & visibility
- `POST /weaves` → Create edge a↔b with relation
- `GET /search/associative` → Hybrid recall (embedding + BM25 + edge boost)
- `POST /invites` → Invite user to memory
- `POST /invites/{token}/accept` → Accept invite
- `POST /artifacts/upload` → Upload artifact (stream via API) and return `{artifact_id, url, bytes, mime}`
- `GET /artifacts/{id}/download?ttl=86400` → Return fresh signed URL `{url, mime, bytes, expires_in}`
- `GET /memories/{id}` → Memory detail (core, layers, participants, edges summary)
- `GET /memories/{id}/suggestions` → Suggested related memories by embedding similarity
- `POST /memories/{id}/permissions` → Owner-only roles & visibility
- `GET /public/{slug}` → Public memory by slug
- `POST /follow/{handle}` / `DELETE /follow/{handle}` / `GET /following`
- `GET /users/{handle}/memories/public` → List public memories for an author
- `GET /export` → Export all user-owned memories (JSON)
- `DELETE /memories/{id}` → Soft delete a memory (owner-only)

Auth: OAuth2 + PKCE (JWT). For local dev, `X-Debug-User: <uuid>` header is accepted.

RLS: Set `SET LOCAL app.user_id = '<uuid>'` per request in DB session.
