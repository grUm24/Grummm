#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${BACKUP_DIR}/platform_${timestamp}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[backup] starting PostgreSQL backup: ${backup_file}"
docker compose -f "${COMPOSE_FILE}" exec -T postgres sh -lc \
  'PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"' \
  | gzip -9 > "${backup_file}"

echo "[backup] backup completed: ${backup_file}"
echo "[backup] retention policy: delete files older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "[backup] done"
