# Phase 9.3 Final Verification

## Scope

- CI/CD smoke after deploy
- Full auth + TaskTracker flow:
  - login
  - create task
  - complete task
  - public page reachability
- Observability and operations:
  - audit logs
  - correlation-id propagation
  - backups

## Server command

```bash
cd /opt
chmod +x platform/infra/server/phase9-smoke.sh
BASE_URL=https://grummm.ru ROOT_DIR=/opt APP_DIR=/opt/platform ./platform/infra/server/phase9-smoke.sh
```

## CI/CD integration

Workflow: `.github/workflows/pipeline.yml`

- `smoke-staging` runs after `deploy-staging`
- `smoke-production` runs after `deploy-production`

Optional environment variables:

- `STAGING_BASE_URL`
- `PRODUCTION_BASE_URL`
- `STAGING_DEPLOY_PATH` (default `/opt`)
- `PRODUCTION_DEPLOY_PATH` (default `/opt`)

## Expected result

- Script exits with code `0`
- No `[FAIL]` checks
- Smoke summary shows `FAIL=0`
