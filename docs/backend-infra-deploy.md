# Backend and Infra Deploy

## Scope

Use this flow when backend, docker, nginx config, compose files, or server-side runtime behavior changed.

## Typical triggers

- ASP.NET backend code changed
- API contracts changed
- `docker-compose.yml` changed
- nginx config changed
- backend Dockerfile changed
- new runtime packages/tools were added

## Preconditions

- repo is uploaded or pulled to `/opt/platform`
- `.env.backend.local` exists at:
  - `/opt/platform/.env.backend.local`
- TLS certs are available for nginx

## Apply

Run on the server:

```bash
cd /opt/platform
docker compose up -d --build --remove-orphans
```

This rebuilds the affected images and recreates containers.

## If only nginx config changed

Use:

```bash
cd /opt/platform
docker compose up -d --build nginx
```

## If only backend changed

Use:

```bash
cd /opt/platform
docker compose up -d --build backend
```

## Post-deploy checks

```bash
curl -ks https://grummm.ru/health
curl -ks https://grummm.ru/ready
```

Expected:

- `/health` returns `"status":"healthy"`
- `/ready` returns `"status":"ready"`

Full smoke:

```bash
chmod +x platform/infra/server/phase9-smoke.sh
BASE_URL=https://grummm.ru ROOT_DIR=/opt/platform APP_DIR=/opt/platform ./platform/infra/server/phase9-smoke.sh
```

## Rollback principle

If deploy failed:

1. Restore previous uploaded repo state or previous commit.
2. Re-run:

```bash
cd /opt/platform
docker compose up -d --build --remove-orphans
```

3. Re-check `/ready` and smoke.
