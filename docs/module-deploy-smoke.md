# Module Deploy Smoke Process

Last Updated: 2026-02-25
Version: 1.0
Status: BASELINE

## 1. Purpose

Define a repeatable test deploy process for a newly added module:

1. Commit
2. Build
3. Docker restart
4. Verify `/projects` and `/app`

## 2. Preconditions

- Ubuntu server is prepared (Phase 2.1 baseline).
- Docker + Docker Compose plugin are installed.
- Repository is available on the server.
- `docker-compose.yml` exists in repo root.

## 3. Process

### Step 1. Commit and push changes

Run on developer machine:

```bash
git add .
git commit -m "Add module: <module-name>"
git push origin <branch>
```

### Step 2. Pull on server

Run on server:

```bash
git fetch --all
git checkout <branch>
git pull --ff-only
```

### Step 3. Build and restart via script

Run on server in repository root:

```bash
chmod +x platform/infra/server/deploy-module-smoke.sh
./platform/infra/server/deploy-module-smoke.sh
```

Optional base URL override:

```bash
BASE_URL="https://grummm.ru" ./platform/infra/server/deploy-module-smoke.sh
```

## 4. Expected Results

- `docker compose build` succeeds for `nginx`, `backend`, `postgres`.
- Containers are recreated successfully.
- `GET /projects` returns frontend HTML (HTTP 2xx/3xx).
- `GET /app` returns frontend HTML (HTTP 2xx/3xx).

Landing/portfolio baseline checks:

- `GET /` returns hero section and project preview cards.
- `GET /projects` returns project grid.
- `GET /projects/task-tracker` returns project detail/public content (HTTP 2xx/3xx).
- Theme and language toggles update UI without page reload.

## 5. Rollback (Baseline)

If verification fails:

```bash
docker compose logs --tail 200 nginx backend postgres
docker compose up -d --force-recreate nginx backend postgres
```
