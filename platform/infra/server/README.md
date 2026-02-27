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

## PostgreSQL Backup

```bash
chmod +x platform/infra/server/postgres-backup.sh
./platform/infra/server/postgres-backup.sh
```

See backup details and cron setup in `docs/postgres-backup.md`.

## Collect Full Server State (single report file)

```bash
chmod +x platform/infra/server/collect-platform-state.sh
./platform/infra/server/collect-platform-state.sh
```

Output file example:

`./reports/platform-state-YYYYMMDDTHHMMSSZ.txt`

## Project Readiness (single command)

```bash
chmod +x infra/server/readiness-check.sh
ROOT_DIR=/opt APP_DIR=/opt/platform ./infra/server/readiness-check.sh
```

Output file example:

`/opt/platform/reports/readiness-YYYYMMDDTHHMMSSZ.txt`

## Frontend-Only Deploy (FileZilla flow)

If frontend code changed only, do this:

1. Build frontend locally:

```bash
npm run build --workspace @platform/frontend
```

2. Upload `platform/frontend` folder to server (`/opt/platform/frontend`).
3. Reload nginx container (no image rebuild):

```bash
cd /opt
docker compose up -d --force-recreate nginx
```

`docker-compose.yml` mounts `./platform/frontend/dist` into nginx at `/usr/share/nginx/html`.
