# PostgreSQL Backups (Phase 9.2)

## Script

- `platform/infra/server/postgres-backup.sh`

The script performs:

- `pg_dump` from running `postgres` compose service
- gzip compression
- retention cleanup (default: 14 days)

## Run manually

```bash
chmod +x platform/infra/server/postgres-backup.sh
./platform/infra/server/postgres-backup.sh
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
10 3 * * * cd /opt/platform && /opt/platform/platform/infra/server/postgres-backup.sh >> /var/log/platform-postgres-backup.log 2>&1
```

## Restore example

```bash
gunzip -c /opt/platform/backups/postgres/platform_YYYYMMDDTHHMMSSZ.sql.gz \
  | docker compose exec -T postgres sh -lc 'PGPASSWORD="${POSTGRES_PASSWORD}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"'
```
