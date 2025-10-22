#!/usr/bin/env bash
set -euo pipefail

# Weave dev runner: starts Postgres (pgvector), applies migrations,
# then runs the FastAPI backend and Next.js UI together.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PG_CONT="weave-pg"
PG_PORT="${PG_PORT:-5432}"
DB_URL_DEFAULT="postgresql://weave_user:weave_password@localhost:${PG_PORT}/weave"
# Allow overriding the Postgres image; default to a valid pgvector tag
PG_IMAGE="${PG_IMAGE:-pgvector/pgvector:pg16}"

have() { command -v "$1" >/dev/null 2>&1; }

log() { echo -e "$1"; }

ensure_pg() {
  if ! have docker; then
    log "[db] Docker is required to run Postgres automatically.\n" \
        "    Install Docker, or run your own Postgres and set DATABASE_URL."
    exit 1
  fi

  if ! docker ps -a --format '{{.Names}}' | grep -q "^${PG_CONT}$"; then
    # If desired port is busy, try to auto-bump to the next free one
    if have lsof; then
      while lsof -nP -iTCP:"${PG_PORT}" -sTCP:LISTEN >/dev/null 2>&1; do
        PG_PORT=$((PG_PORT+1))
      done
    else
      if nc -z localhost "${PG_PORT}" >/dev/null 2>&1; then
        PG_PORT=$((PG_PORT+1))
      fi
    fi
    DB_URL_DEFAULT="postgresql://weave_user:weave_password@localhost:${PG_PORT}/weave"
    log "[db] Pulling Postgres image ($PG_IMAGE) ..."
    if ! docker pull "$PG_IMAGE" >/dev/null; then
      log "[db] Failed to pull $PG_IMAGE. Try setting PG_IMAGE (e.g., pgvector/pgvector:pg16) and re-run."
      exit 1
    fi
    log "[db] Starting new Postgres (pgvector) container '${PG_CONT}' on port ${PG_PORT}..."
    docker run -d \
      --name "${PG_CONT}" \
      -e POSTGRES_USER=weave_user \
      -e POSTGRES_PASSWORD=weave_password \
      -e POSTGRES_DB=weave \
      -p ${PG_PORT}:5432 \
      "$PG_IMAGE" >/dev/null
  else
    log "[db] Using existing Postgres container '${PG_CONT}'."
    if ! docker start "${PG_CONT}" >/dev/null 2>&1; then
      log "[db] Existing container failed to start (likely port ${PG_PORT} is busy). Recreating on a free port..."
      # Find a free host port and recreate the container mapping
      if have lsof; then
        while lsof -nP -iTCP:"${PG_PORT}" -sTCP:LISTEN >/dev/null 2>&1; do
          PG_PORT=$((PG_PORT+1))
        done
      else
        if nc -z localhost "${PG_PORT}" >/dev/null 2>&1; then
          PG_PORT=$((PG_PORT+1))
        fi
      fi
      DB_URL_DEFAULT="postgresql://weave_user:weave_password@localhost:${PG_PORT}/weave"
      docker rm -f "${PG_CONT}" >/dev/null 2>&1 || true
      log "[db] Starting new Postgres (pgvector) container '${PG_CONT}' on port ${PG_PORT}..."
      docker run -d \
        --name "${PG_CONT}" \
        -e POSTGRES_USER=weave_user \
        -e POSTGRES_PASSWORD=weave_password \
        -e POSTGRES_DB=weave \
        -p ${PG_PORT}:5432 \
        "$PG_IMAGE" >/dev/null
    fi
  fi

  log "[db] Waiting for Postgres to become ready..."
  for i in {1..60}; do
    if docker exec "${PG_CONT}" pg_isready -U weave_user -d weave >/dev/null 2>&1; then
      log "[db] Postgres is ready."
      return 0
    fi
    sleep 1
  done
  log "[db] Postgres did not become ready in time."; exit 1
}

migrate() {
  local db_url
  db_url="${DATABASE_URL:-$DB_URL_DEFAULT}"
  export DATABASE_URL="$db_url"
  log "[db] Applying SQL migrations to $db_url ..."

  local files=(
    "services/api/app/db/migrations/0001_init.sql"
    "services/api/app/db/migrations/0002_idempotency.sql"
    "services/api/app/db/migrations/0003_core_locked_at.sql"
    "services/api/app/db/migrations/0004_memory_event.sql"
    "services/api/app/db/rls.sql"
  )

  for f in "${files[@]}"; do
    log "[db]  - ${f}"
    docker exec -i "${PG_CONT}" psql -U weave_user -d weave -f - < "${ROOT_DIR}/${f}"
  done
}

start_api() {
  log "[api] Installing deps and starting FastAPI on :8000 ..."
  (
    cd "${ROOT_DIR}/services/api"
    local py="python3"
    have "$py" || py="python"
    "$py" -m venv .venv
    source .venv/bin/activate
    pip install -q -r requirements.txt
    export DATABASE_URL="${DATABASE_URL:-$DB_URL_DEFAULT}"
    export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:3000}"
    exec python -m uvicorn app.main:app --reload --port 8000
  ) | sed -u 's/^/[api] /' &
  API_PID=$!
}

start_ui() {
  log "[ui] Installing deps and starting Next.js on :3000 ..."
  (
    cd "${ROOT_DIR}/apps/chatgpt-ui"
    export PYTHON_API_BASE="${PYTHON_API_BASE:-http://localhost:8000}"
    npm install --silent
    exec npm run dev --silent
  ) | sed -u 's/^/[ui] /' &
  UI_PID=$!
}

cleanup() {
  log "\n[dev] Stopping app processes..."
  [[ -n "${API_PID:-}" ]] && kill "${API_PID}" 2>/dev/null || true
  [[ -n "${UI_PID:-}" ]] && kill "${UI_PID}" 2>/dev/null || true
}

down() {
  cleanup || true
  if have docker; then
    log "[db] To stop Postgres:  docker stop ${PG_CONT}"
  fi
}

case "${1:-up}" in
  down)
    down
    exit 0
    ;;
  up|*)
    ensure_pg
    migrate
    start_api
    start_ui
    log "\n[dev] Weave is running:\n  - UI:  http://localhost:3000\n  - API: http://localhost:8000/v1/health\n\nPress Ctrl+C to stop (DB stays running)."
    trap cleanup INT TERM
    wait "${API_PID}" "${UI_PID}" || true
    cleanup
    ;;
esac
