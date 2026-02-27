#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

detect_root() {
  if [ -n "${ROOT_DIR:-}" ] && [ -f "${ROOT_DIR}/docker-compose.yml" ]; then
    echo "${ROOT_DIR}"
    return
  fi

  local candidate1 candidate2
  candidate1="$(cd "${SCRIPT_DIR}/../.." && pwd)"
  candidate2="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

  if [ -f "${candidate1}/docker-compose.yml" ]; then
    echo "${candidate1}"
    return
  fi

  if [ -f "${candidate2}/docker-compose.yml" ]; then
    echo "${candidate2}"
    return
  fi

  echo "$(pwd)"
}

ROOT_DIR="$(detect_root)"
OUT_DIR="${1:-${ROOT_DIR}/reports}"
mkdir -p "${OUT_DIR}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${OUT_DIR}/platform-state-${STAMP}.txt"
COMPOSE_ARGS=(-f "${ROOT_DIR}/docker-compose.yml")

if [ -f "${ROOT_DIR}/docker-compose.deploy.yml" ]; then
  COMPOSE_ARGS+=(-f "${ROOT_DIR}/docker-compose.deploy.yml")
fi

PATH_PREFIX="platform"
if [ -f "${ROOT_DIR}/platform/backend/Dockerfile" ] && [ -f "${ROOT_DIR}/platform/infra/nginx/default.conf" ]; then
  PATH_PREFIX="platform"
elif [ -f "${ROOT_DIR}/backend/Dockerfile" ] && [ -f "${ROOT_DIR}/infra/nginx/default.conf" ]; then
  PATH_PREFIX=""
fi

run() {
  local title="$1"
  shift
  {
    echo
    echo "===== ${title} ====="
    echo "+ $*"
    "$@" 2>&1 || echo "[ERROR] command failed with exit code $?"
  } >> "${OUT_FILE}"
}

{
  echo "Platform State Report"
  echo "Generated UTC: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Host: $(hostname 2>/dev/null || echo unknown)"
  echo "User: $(whoami 2>/dev/null || echo unknown)"
  echo "PWD: $(pwd)"
  echo "ROOT_DIR: ${ROOT_DIR}"
  echo "PATH_PREFIX: ${PATH_PREFIX}"
} > "${OUT_FILE}"

run "OS" uname -a
run "Disk Usage" df -h
run "Memory" free -h

run "Docker Version" docker --version
run "Docker Compose Version" docker compose version
run "Docker Compose PS" docker compose "${COMPOSE_ARGS[@]}" ps
run "Docker Compose Images" docker compose "${COMPOSE_ARGS[@]}" images
run "Docker Compose Config" docker compose "${COMPOSE_ARGS[@]}" config

run "Container Logs backend (tail 120)" docker compose "${COMPOSE_ARGS[@]}" logs --tail=120 backend
run "Container Logs nginx (tail 120)" docker compose "${COMPOSE_ARGS[@]}" logs --tail=120 nginx
run "Container Logs postgres (tail 120)" docker compose "${COMPOSE_ARGS[@]}" logs --tail=120 postgres

run "Nginx Config Test" docker compose "${COMPOSE_ARGS[@]}" exec -T nginx nginx -t
run "Nginx Effective Config (first 200 lines)" sh -lc "docker compose ${COMPOSE_ARGS[*]} exec -T nginx nginx -T | sed -n '1,200p'"

run "Health Endpoint" curl -k -i https://grummm.ru/health
run "Ready Endpoint" curl -k -i https://grummm.ru/ready
run "Public Auth Endpoint" curl -k -i https://grummm.ru/api/public/auth/login

if [ -n "${PATH_PREFIX}" ]; then
  BACKEND_DOCKERFILE="${ROOT_DIR}/${PATH_PREFIX}/backend/Dockerfile"
  PROGRAM_CS="${ROOT_DIR}/${PATH_PREFIX}/backend/src/WebAPI/Program.cs"
  NGINX_CONF="${ROOT_DIR}/${PATH_PREFIX}/infra/nginx/default.conf"
else
  BACKEND_DOCKERFILE="${ROOT_DIR}/backend/Dockerfile"
  PROGRAM_CS="${ROOT_DIR}/backend/src/WebAPI/Program.cs"
  NGINX_CONF="${ROOT_DIR}/infra/nginx/default.conf"
fi

run "Critical Files Checksum" sh -lc "sha256sum '${ROOT_DIR}/docker-compose.yml' '${ROOT_DIR}/docker-compose.deploy.yml' '${BACKEND_DOCKERFILE}' '${PROGRAM_CS}' '${NGINX_CONF}' 2>/dev/null"
run "Critical File: backend Dockerfile" sed -n '1,220p' "${BACKEND_DOCKERFILE}"
run "Critical File: Program.cs (first 260 lines)" sed -n '1,260p' "${PROGRAM_CS}"
run "Critical File: nginx default.conf" sed -n '1,260p' "${NGINX_CONF}"

if command -v git >/dev/null 2>&1; then
  run "Git Status" git -C "${ROOT_DIR}" status --short
  run "Git Last Commit" git -C "${ROOT_DIR}" log -1 --oneline
else
  {
    echo
    echo "===== Git ====="
    echo "git command not found on server."
  } >> "${OUT_FILE}"
fi

echo
echo "Saved: ${OUT_FILE}"
