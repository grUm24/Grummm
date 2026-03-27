#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${ROOT_DIR:-$(cd "${SCRIPT_DIR}/../../.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT_DIR}/docker-compose.yml}"
READY_URL="${READY_URL:-https://grummm.ru/ready}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-45}"
SLEEP_SECONDS="${SLEEP_SECONDS:-2}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[deploy] docker is required on the target host."
  exit 1
fi

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "[deploy] compose file not found: ${COMPOSE_FILE}"
  exit 1
fi

if [ ! -f "${ROOT_DIR}/.env.backend.local" ]; then
  echo "[deploy] missing ${ROOT_DIR}/.env.backend.local"
  exit 1
fi

mkdir -p "${ROOT_DIR}/backups/postgres"

echo "[deploy] root: ${ROOT_DIR}"
echo "[deploy] using static frontend snapshot from platform/infra/nginx/static"
echo "[deploy] creating/updating containers"
docker compose -f "${COMPOSE_FILE}" up -d --build --remove-orphans

if ! command -v curl >/dev/null 2>&1; then
  echo "[deploy] curl is not installed; skipping readiness polling"
  exit 0
fi

echo "[deploy] waiting for readiness: ${READY_URL}"
for ((attempt=1; attempt<=MAX_ATTEMPTS; attempt++)); do
  body="$(curl -ks "${READY_URL}" || true)"
  if echo "${body}" | grep -q '"status":"ready"'; then
    echo "[deploy] ready after attempt ${attempt}"
    exit 0
  fi

  echo "[deploy] attempt ${attempt}/${MAX_ATTEMPTS}: not ready yet"
  sleep "${SLEEP_SECONDS}"
done

echo "[deploy] readiness check did not turn green in time"
exit 1
