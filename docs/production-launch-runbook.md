# Production Launch Runbook (Phase 9.5)

## 1. Preconditions

- Latest backend/frontend/infra files are uploaded to `/opt/platform` (FileZilla flow).
- Compose root is `/opt`.
- `postgres`, `backend`, `nginx` services exist in `/opt/docker-compose.yml`.
- TLS certs are already mounted for nginx.

## 2. Launch Sequence

```bash
cd /opt/platform
chmod +x platform/infra/server/bootstrap-platform-stack.sh
ROOT_DIR=/opt/platform READY_URL=https://grummm.ru/ready ./platform/infra/server/bootstrap-platform-stack.sh
```

Equivalent manual fallback:

```bash
cd /opt/platform
docker compose up -d --build --remove-orphans
```

## 3. Mandatory Post-Launch Verification

```bash
BASE_URL=https://grummm.ru ROOT_DIR=/opt APP_DIR=/opt/platform ./platform/infra/server/phase9-smoke.sh
```

Expected:

- `Smoke summary: PASS=10 FAIL=0`

If failed, collect state:

```bash
ROOT_DIR=/opt/platform ./platform/infra/server/collect-platform-state.sh
```

## 4. Rollback

If launch fails and must be rolled back:

1. Restore previous uploaded artifacts (manual FileZilla fallback).
2. Rebuild/restart:

```bash
cd /opt
docker compose build --no-cache backend nginx
docker compose up -d --force-recreate postgres backend nginx
```

3. Re-run smoke script and confirm green status.

## 5. Backup Controls

Local backup:

```bash
ROOT_DIR=/opt/platform BACKUP_DIR=/opt/platform/backups/postgres ./platform/infra/server/postgres-backup.sh
```

Admin backup:

- `/app` -> readiness card -> `Create backup`
- resulting file is stored in `/opt/platform/backups/postgres`

Restore drill:

```bash
ROOT_DIR=/opt/platform COMPOSE_FILE=/opt/platform/docker-compose.yml BACKUP_DIR=/opt/platform/backups/postgres ./platform/infra/server/postgres-restore-drill.sh
```

Offsite sync (optional until remote target is ready):

```bash
BACKUP_DIR=/opt/platform/backups/postgres OFFSITE_TARGET='backup@<host>:/srv/backups/platform-postgres' ./platform/infra/server/postgres-backup-offsite.sh
```
