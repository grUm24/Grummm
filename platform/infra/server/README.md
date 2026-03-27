# Ubuntu Server Baseline (Phase 2.1)

## Goal

Apply baseline server hardening:

- UFW open ports: `80/tcp`, `443/tcp`
- SSH only by key
- Password authentication disabled
- `unattended-upgrades` enabled

## Files

- `platform/infra/server/bootstrap-ubuntu.sh`
- `platform/infra/server/verify-ubuntu-hardening.sh`
- `platform/infra/server/deploy-module-smoke.sh`

## Apply

```bash
chmod +x platform/infra/server/bootstrap-ubuntu.sh platform/infra/server/verify-ubuntu-hardening.sh
sudo ./platform/infra/server/bootstrap-ubuntu.sh
```

Temporary option (if you must keep SSH on UFW during rollout):

```bash
sudo ./platform/infra/server/bootstrap-ubuntu.sh --allow-ssh
```

## Verify

```bash
sudo ./platform/infra/server/verify-ubuntu-hardening.sh
```

## Module Deploy Smoke

```bash
chmod +x platform/infra/server/deploy-module-smoke.sh
./platform/infra/server/deploy-module-smoke.sh
```

## Full platform bootstrap / rebuild

```bash
chmod +x platform/infra/server/bootstrap-platform-stack.sh
ROOT_DIR=/opt/platform READY_URL=https://grummm.ru/ready ./platform/infra/server/bootstrap-platform-stack.sh
```

This is the fastest path for moving the stack to a new IP when repo files and `.env.backend.local` are already on the host.
The script uses the committed `platform/infra/nginx/static` snapshot, so Node/npm are not required on the server.

## PostgreSQL Backup

```bash
chmod +x platform/infra/server/postgres-backup.sh
./platform/infra/server/postgres-backup.sh
```

See backup details and cron setup in `docs/postgres-backup.md`.

Admin workspace also exposes `Create backup` in the readiness card. It writes artifacts to `backups/postgres` and downloads the generated `.sql.gz` file immediately.

Offsite + restore drill:

```bash
chmod +x platform/infra/server/postgres-backup-offsite.sh platform/infra/server/postgres-restore-drill.sh
```

## Collect Full Server State (single report file)

```bash
chmod +x platform/infra/server/collect-platform-state.sh
./platform/infra/server/collect-platform-state.sh
```

Output file example:

`./reports/platform-state-YYYYMMDDTHHMMSSZ.txt`

## Project Readiness (single command)

```bash
chmod +x platform/infra/server/readiness-check.sh
ROOT_DIR=/opt/platform APP_DIR=/opt/platform ./platform/infra/server/readiness-check.sh
```

Output file example:

`/opt/platform/reports/readiness-YYYYMMDDTHHMMSSZ.txt`

## Frontend-Only Deploy (FileZilla flow)

If frontend code changed only, do this:

1. Build frontend locally:

```bash
npm run build --workspace @platform/frontend
```

2. Upload `platform/infra/nginx/static` folder to server (`/opt/platform/platform/infra/nginx/static`).
3. Reload nginx container (no image rebuild):

```bash
cd /opt/platform
docker compose up -d --force-recreate nginx
```

`docker-compose.yml` mounts `./platform/infra/nginx/static` into nginx at `/usr/share/nginx/html`.

## Phase 9.3 smoke

```bash
chmod +x platform/infra/server/phase9-smoke.sh
BASE_URL=https://grummm.ru ROOT_DIR=/opt/platform APP_DIR=/opt/platform ./platform/infra/server/phase9-smoke.sh
```

## Phase 9.5 handover and launch

- `docs/handover-checklist.md`
- `docs/production-launch-runbook.md`
