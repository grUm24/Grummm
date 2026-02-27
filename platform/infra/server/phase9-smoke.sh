#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://grummm.ru}"
ROOT_DIR="${ROOT_DIR:-/opt}"
APP_DIR="${APP_DIR:-/opt/platform}"
OWNER_USER_ID="${OWNER_USER_ID:-smoke-owner}"
LOGIN_USER="${LOGIN_USER:-smoke-admin}"
LOGIN_PASSWORD="${LOGIN_PASSWORD:-smoke-pass-123}"
WINDOW_MINUTES="${WINDOW_MINUTES:-30}"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

PASS=0
FAIL=0

ok() {
  PASS=$((PASS + 1))
  echo "[OK] $1"
}

fail() {
  FAIL=$((FAIL + 1))
  echo "[FAIL] $1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command: $1"
    exit 1
  fi
}

require_cmd curl
require_cmd python3
require_cmd docker

echo "Running phase-9 smoke check against ${BASE_URL}"

HEALTH_BODY="${WORK_DIR}/health.json"
READY_BODY="${WORK_DIR}/ready.json"
LOGIN_BODY="${WORK_DIR}/login.json"
CREATE_BODY="${WORK_DIR}/create.json"
COMPLETE_BODY="${WORK_DIR}/complete.json"
COOKIE_JAR="${WORK_DIR}/cookies.txt"
HEADERS_FILE="${WORK_DIR}/headers.txt"

curl -ksS -o "${HEALTH_BODY}" "${BASE_URL}/health" || true
if grep -q '"status":"healthy"' "${HEALTH_BODY}"; then
  ok "/health returns healthy"
else
  fail "/health did not return healthy"
fi

curl -ksS -o "${READY_BODY}" "${BASE_URL}/ready" || true
if grep -q '"status":"ready"' "${READY_BODY}"; then
  ok "/ready returns ready"
else
  fail "/ready did not return ready"
fi

REQUEST_CORR_ID="smoke-corr-$(date +%s)"
curl -ksSI -H "X-Correlation-ID: ${REQUEST_CORR_ID}" "${BASE_URL}/health" > "${HEADERS_FILE}" || true
if grep -iq "^x-correlation-id: ${REQUEST_CORR_ID}" "${HEADERS_FILE}"; then
  ok "correlation-id is echoed in response headers"
else
  fail "correlation-id was not propagated in response headers"
fi

curl -ksS -c "${COOKIE_JAR}" \
  -H "Content-Type: application/json" \
  -d "{\"userName\":\"${LOGIN_USER}\",\"password\":\"${LOGIN_PASSWORD}\"}" \
  -o "${LOGIN_BODY}" \
  "${BASE_URL}/api/public/auth/login" || true

ACCESS_TOKEN="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1],"r",encoding="utf-8")); print(d.get("accessToken",""))' "${LOGIN_BODY}" 2>/dev/null || true)"
if [ -n "${ACCESS_TOKEN}" ]; then
  ok "login returns access token"
else
  fail "login did not return access token"
fi

CREATE_STATUS="$(curl -ksS -o "${CREATE_BODY}" -w "%{http_code}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Smoke Task","description":"Phase 9 smoke verification"}' \
  "${BASE_URL}/api/app/tasks/${OWNER_USER_ID}" || true)"

if [ "${CREATE_STATUS}" = "201" ]; then
  ok "create task returns 201"
else
  fail "create task returned ${CREATE_STATUS}"
fi

TASK_ID="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1],"r",encoding="utf-8")); print(d.get("id",""))' "${CREATE_BODY}" 2>/dev/null || true)"
if [ -n "${TASK_ID}" ]; then
  ok "created task id parsed"
else
  fail "created task id missing in response"
fi

COMPLETE_STATUS="$(curl -ksS -o "${COMPLETE_BODY}" -w "%{http_code}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -X PATCH \
  "${BASE_URL}/api/app/tasks/${OWNER_USER_ID}/${TASK_ID}/complete" || true)"

if [ "${COMPLETE_STATUS}" = "200" ] && grep -q '"isCompleted":true' "${COMPLETE_BODY}"; then
  ok "complete task returns 200 and marks item completed"
else
  fail "complete task failed (status=${COMPLETE_STATUS})"
fi

PUBLIC_STATUS="$(curl -ksS -o /dev/null -w "%{http_code}" "${BASE_URL}/projects/task-tracker" || true)"
APP_STATUS="$(curl -ksS -o /dev/null -w "%{http_code}" "${BASE_URL}/app/tasks" || true)"
if [ "${PUBLIC_STATUS}" = "200" ] && [ "${APP_STATUS}" = "200" ]; then
  ok "public and private module pages are reachable"
else
  fail "module pages check failed (public=${PUBLIC_STATUS}, private=${APP_STATUS})"
fi

AUDIT_COUNT="$(docker compose -f "${ROOT_DIR}/docker-compose.yml" exec -T postgres sh -lc \
  "PGPASSWORD=\"\$POSTGRES_PASSWORD\" psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -tAc \"SELECT count(*) FROM audit.admin_action_audit_logs WHERE request_path LIKE '/api/app/tasks%' AND occurred_at_utc > now() - interval '${WINDOW_MINUTES} minutes';\"" 2>/dev/null | tr -d '[:space:]' || true)"
if [ -n "${AUDIT_COUNT}" ] && [ "${AUDIT_COUNT}" -ge 1 ] 2>/dev/null; then
  ok "audit logs contain recent /api/app/tasks write actions"
else
  fail "audit check failed (count='${AUDIT_COUNT:-empty}')"
fi

if ls "${APP_DIR}/backups/postgres/"*.sql.gz >/dev/null 2>&1; then
  ok "postgres backup artifacts exist"
else
  fail "postgres backup artifacts are missing in ${APP_DIR}/backups/postgres"
fi

echo "Smoke summary: PASS=${PASS} FAIL=${FAIL}"
if [ "${FAIL}" -gt 0 ]; then
  exit 1
fi
