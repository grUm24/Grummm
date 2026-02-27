#!/usr/bin/env bash
set -u

ROOT_DIR="${ROOT_DIR:-/opt}"
APP_DIR="${APP_DIR:-${ROOT_DIR}/platform}"
REPORT_FILE="${REPORT_FILE:-${APP_DIR}/reports/readiness-$(date -u +%Y%m%dT%H%M%SZ).txt}"

mkdir -p "$(dirname "${REPORT_FILE}")"

pass_count=0
warn_count=0
fail_count=0

ok() {
  pass_count=$((pass_count + 1))
  printf "[OK] %s\n" "$1" | tee -a "${REPORT_FILE}"
}

warn() {
  warn_count=$((warn_count + 1))
  printf "[WARN] %s\n" "$1" | tee -a "${REPORT_FILE}"
}

fail() {
  fail_count=$((fail_count + 1))
  printf "[FAIL] %s\n" "$1" | tee -a "${REPORT_FILE}"
}

section() {
  printf "\n=== %s ===\n" "$1" | tee -a "${REPORT_FILE}"
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

check_cmd() {
  local cmd="$1"
  local msg="$2"
  if has_cmd "${cmd}"; then
    ok "${msg}"
  else
    fail "${msg} (command not found: ${cmd})"
  fi
}

{
  echo "Project Readiness Check"
  echo "UTC: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "ROOT_DIR=${ROOT_DIR}"
  echo "APP_DIR=${APP_DIR}"
  echo
} > "${REPORT_FILE}"

section "Tooling"
check_cmd docker "Docker is installed"
check_cmd curl "curl is installed"

section "Compose"
if [ -f "${ROOT_DIR}/docker-compose.yml" ]; then
  ok "docker-compose.yml exists (${ROOT_DIR}/docker-compose.yml)"
else
  fail "docker-compose.yml is missing at ${ROOT_DIR}/docker-compose.yml"
fi

if docker compose -f "${ROOT_DIR}/docker-compose.yml" ps >/dev/null 2>&1; then
  ok "docker compose can read project at ${ROOT_DIR}"
else
  fail "docker compose project is not readable at ${ROOT_DIR}"
fi

compose_ps="$(docker compose -f "${ROOT_DIR}/docker-compose.yml" ps 2>/dev/null || true)"
if echo "${compose_ps}" | grep -q "platform-backend"; then
  ok "backend service is present in compose"
else
  fail "backend service is missing in compose output"
fi
if echo "${compose_ps}" | grep -q "platform-nginx"; then
  ok "nginx service is present in compose"
else
  fail "nginx service is missing in compose output"
fi
if echo "${compose_ps}" | grep -q "platform-postgres"; then
  ok "postgres service is present in compose"
else
  fail "postgres service is missing in compose output"
fi

section "Runtime Health"
health_body="$(curl -k -s https://grummm.ru/health || true)"
ready_body="$(curl -k -s https://grummm.ru/ready || true)"

if echo "${health_body}" | grep -q '"status":"healthy"'; then
  ok "/health returns healthy"
else
  fail "/health is not healthy (body: ${health_body})"
fi

if echo "${ready_body}" | grep -q '"status":"ready"'; then
  ok "/ready returns ready"
else
  fail "/ready is not ready (body: ${ready_body})"
fi

if echo "${health_body}" | grep -q 'Platform.WebAPI'; then
  ok "backend is real WebAPI (not placeholder)"
else
  fail "backend response does not contain Platform.WebAPI marker"
fi

section "Backups"
if [ -f "${APP_DIR}/infra/server/postgres-backup.sh" ]; then
  ok "postgres backup script exists"
else
  fail "postgres backup script missing: ${APP_DIR}/infra/server/postgres-backup.sh"
fi

if [ -d "${APP_DIR}/backups/postgres" ] && ls "${APP_DIR}/backups/postgres"/*.sql.gz >/dev/null 2>&1; then
  ok "postgres backup files found in ${APP_DIR}/backups/postgres"
else
  warn "no postgres backup files found yet (${APP_DIR}/backups/postgres/*.sql.gz)"
fi

if crontab -l 2>/dev/null | grep -q "postgres-backup.sh"; then
  ok "cron entry for postgres backup is configured"
else
  warn "cron entry for postgres backup is not configured"
fi

section "Readiness Summary"
printf "PASS=%d WARN=%d FAIL=%d\n" "${pass_count}" "${warn_count}" "${fail_count}" | tee -a "${REPORT_FILE}"

echo | tee -a "${REPORT_FILE}"
if [ "${fail_count}" -eq 0 ] && [ "${warn_count}" -eq 0 ]; then
  echo "PROJECT STATUS: READY FOR PHASE 9.3" | tee -a "${REPORT_FILE}"
else
  echo "PROJECT STATUS: NOT FULLY READY" | tee -a "${REPORT_FILE}"
  echo "Remaining steps:" | tee -a "${REPORT_FILE}"
  if [ "${fail_count}" -gt 0 ]; then
    echo "1) Resolve all FAIL checks above (blocking)." | tee -a "${REPORT_FILE}"
  fi
  if [ "${warn_count}" -gt 0 ]; then
    echo "2) Resolve WARN checks (recommended before production readiness sign-off)." | tee -a "${REPORT_FILE}"
  fi
  echo "3) Next planned task: Phase 9.3 post-deploy smoke in CI/CD pipeline." | tee -a "${REPORT_FILE}"
fi

echo | tee -a "${REPORT_FILE}"
echo "Report saved: ${REPORT_FILE}" | tee -a "${REPORT_FILE}"
