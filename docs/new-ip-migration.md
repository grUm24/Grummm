# Migration to a New IP

## Goal

Move the platform to a new server/IP with the shortest operational path and minimal manual rebuild work.

## What must be prepared first

- DNS can be pointed to the new IP
- the new server has Docker and Docker Compose
- repo files are present at:
  - `/opt/platform`
- backend env file exists:
  - `/opt/platform/.env.backend.local`
- TLS certificates are ready for nginx
- if data must be preserved, a PostgreSQL backup exists

## 1. Upload project files

Copy the repository to:

```text
/opt/platform
```

Important:

- committed frontend snapshot is already in `platform/infra/nginx/static`
- Node/npm are not required on the target server for the first boot

## 2. If needed, restore data backup

If you are moving existing production data, place the latest backup in:

```text
/opt/platform/backups/postgres
```

Restore later only if required by the cutover plan.

## 3. Bootstrap the stack

Run:

```bash
cd /opt/platform
chmod +x platform/infra/server/bootstrap-platform-stack.sh
ROOT_DIR=/opt/platform READY_URL=https://grummm.ru/ready ./platform/infra/server/bootstrap-platform-stack.sh
```

What the script does:

- ensures `backups/postgres` exists
- runs `docker compose up -d --build --remove-orphans`
- waits until `/ready` becomes green

## 4. Point DNS to the new IP

After the stack is up, update A/AAAA records for:

- `grummm.ru`
- `www.grummm.ru`
- `demo.grummm.ru` if demo origin separation is in use

## 5. Verify the new host

```bash
curl -I https://grummm.ru/
curl -ks https://grummm.ru/ready
curl -I https://grummm.ru/does-not-exist
```

Expected:

- main site responds
- `/ready` is green
- invalid route returns `404`

Then run full smoke:

```bash
chmod +x platform/infra/server/phase9-smoke.sh
BASE_URL=https://grummm.ru ROOT_DIR=/opt/platform APP_DIR=/opt/platform ./platform/infra/server/phase9-smoke.sh
```

## 6. Restore database if this is a real migration

If the new server should continue the old production state:

```bash
gunzip -c /opt/platform/backups/postgres/platform_YYYYMMDDTHHMMSSZ.sql.gz \
  | docker compose exec -T postgres sh -lc 'PGPASSWORD="${POSTGRES_PASSWORD}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"'
```

Then re-check:

```bash
curl -ks https://grummm.ru/ready
```

## 7. Final checks

- admin login works
- overview page loads
- `Create backup` downloads a fresh `.sql.gz`
- public routes work
- posts/projects detail routes work
- invalid routes return `404`
- static demo routes work if enabled

## Fast summary

The minimum migration sequence is:

1. copy repo to `/opt/platform`
2. place `.env.backend.local`
3. run `bootstrap-platform-stack.sh`
4. switch DNS
5. run smoke
