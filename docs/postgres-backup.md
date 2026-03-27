# PostgreSQL Backups (Phase 9.2)

## Script

- `platform/infra/server/postgres-backup.sh`
- `platform/infra/server/postgres-backup-offsite.sh`
- `platform/infra/server/postgres-restore-drill.sh`

The script performs:

- `pg_dump` from running `postgres` compose service
- gzip compression
- retention cleanup (default: 14 days)
- admin-triggered backups from `/app` now write into the same `backups/postgres` directory and download the created artifact to the browser

## Run manually

```bash
ROOT_DIR=/opt/platform \
BACKUP_DIR=/opt/platform/backups/postgres \
chmod +x platform/infra/server/postgres-backup.sh
./platform/infra/server/postgres-backup.sh
```

## Offsite shipping

```bash
chmod +x platform/infra/server/postgres-backup-offsite.sh
BACKUP_DIR=/opt/platform/backups/postgres \
OFFSITE_TARGET='backup@backup-host:/srv/backups/platform-postgres' \
OFFSITE_RETENTION_DAYS=30 \
./platform/infra/server/postgres-backup-offsite.sh
```

## Optional parameters

```bash
ROOT_DIR=/opt/platform \
COMPOSE_FILE=docker-compose.yml \
BACKUP_DIR=/opt/platform/backups/postgres \
RETENTION_DAYS=14 \
./platform/infra/server/postgres-backup.sh
```

## Cron example (daily at 03:10 UTC)

```cron
10 3 * * * cd /opt/platform && ROOT_DIR=/opt/platform BACKUP_DIR=/opt/platform/backups/postgres /opt/platform/platform/infra/server/postgres-backup.sh >> /var/log/platform-postgres-backup.log 2>&1
```

## Cron example for offsite sync (daily at 03:30 UTC)

```cron
30 3 * * * cd /opt/platform && BACKUP_DIR=/opt/platform/backups/postgres OFFSITE_TARGET='backup@backup-host:/srv/backups/platform-postgres' /opt/platform/platform/infra/server/postgres-backup-offsite.sh >> /var/log/platform-postgres-offsite.log 2>&1
```

## Restore example

```bash
gunzip -c /opt/platform/backups/postgres/platform_YYYYMMDDTHHMMSSZ.sql.gz \
  | docker compose exec -T postgres sh -lc 'PGPASSWORD="${POSTGRES_PASSWORD}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"'
```

## Restore drill (safe test DB)

```bash
chmod +x platform/infra/server/postgres-restore-drill.sh
ROOT_DIR=/opt/platform \
COMPOSE_FILE=/opt/platform/docker-compose.yml \
BACKUP_DIR=/opt/platform/backups/postgres \
./platform/infra/server/postgres-restore-drill.sh
```

Optional:

- `BACKUP_FILE=/opt/platform/backups/postgres/platform_YYYYMMDDTHHMMSSZ.sql.gz`
- `DROP_AFTER_CHECK=false` (to inspect restored DB before drop)
