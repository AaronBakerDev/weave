# Repository Guidelines

## Project Structure & Module Organization
The repo centers on two active surfaces. `apps/chatgpt-ui/` hosts the Next.js 14 app that powers the ChatGPT experience; keep feature work inside the `app/` route folders (for example `canvas/`, `memory/`, `api/proxy/`) and shared UI in `components/`. The Python FastAPI backend lives in `services/api/` with routers in `app/routers/`, database migrations under `app/db/migrations/`, and the embeddings worker in `app/workers/indexing.py`. Docs live in `doc.md` and `specs/`; infra helpers sit in `infra/` and `scripts/` (especially `scripts/dev.sh` driving the Make targets).

## Build, Test, and Development Commands
Run `make dev` from the repo root to provision pgvector Postgres, apply migrations, and start both FastAPI (`:8000`) and Next.js (`:3000`). Use `make down` to stop the long-running processes. In `services/api/`, activate the virtualenv then run `pytest` or start the API with `uvicorn app.main:app --reload`. In `apps/chatgpt-ui/`, install deps once via `npm install`, run `npm run dev` for local hacking, and execute `npm run build` before shipping UI changes.

## Coding Style & Naming Conventions
Match the existing conventions: two-space indentation and PascalCase component files in the UI (`WeaverCard.tsx`), snake_case modules and four-space indentation in Python (`search.py`). Prefer TypeScript types over `any`, colocate route handlers under `app/api/*`, and keep Tailwind class lists readable by grouping semantic chunks. The backend uses Ruff for linting; run `pip install -r requirements-dev.txt` then `ruff check services/api/app --fix`. JSON and manifest files should stay camelCase to align with existing API contracts.

## Testing Guidelines
Unit and flow tests live in `services/api/tests/` and follow `test_*.py` naming; mirror that pattern when adding new cases. Tests assume pgvector Postgres on `DATABASE_URL`; reuse the `make dev` container before running `pytest -q`. For UI changes, add Playwright smoke coverage under `apps/chatgpt-ui/tests/` (create the folder if missing) and document manual verification steps in your PR when automated coverage is not feasible.

## Commit & Pull Request Guidelines
Commit messages stay short and imperative (example: `Add edge boost scoring hook`). Squash small fixups locally and push cohesive commits. PRs should link the relevant issue, describe the change, call out schema or API impacts, and include screenshots or curl snippets for UI/API work. Confirm `make dev` and `pytest` both pass, and note any remaining TODOs in the description so reviewers can plan follow-ups.
