# Handover Checklist (Phase 9.5)

## Scope

- Transfer operational ownership without changing locked architecture boundaries.
- Confirm repeatable deploy, rollback, smoke, and backup procedures.

## Checklist

- Project baseline:
  - `Phase 9.3` smoke is green (`PASS=10`, `FAIL=0`).
  - Locked route zones remain unchanged:
    - public web: `/`, `/projects`, `/projects/:id`
    - private web: `/app`, `/app/:module`, `/app/:module/*`
    - public API: `/api/public/*`
    - private API: `/api/app/*`
- Environments and secrets:
  - staging/production secrets are present in GitHub Environments.
  - deploy path vars are defined (`*_DEPLOY_PATH`) or default to `/opt`.
- Runtime operations:
  - server readiness command works:
    - `ROOT_DIR=/opt/platform APP_DIR=/opt/platform ./platform/infra/server/readiness-check.sh`
  - smoke command works:
    - `BASE_URL=https://grummm.ru ROOT_DIR=/opt/platform APP_DIR=/opt/platform ./platform/infra/server/phase9-smoke.sh`
- Backup operations:
  - local backup runs and artifacts are present.
  - admin backup button downloads a fresh `.sql.gz` artifact and writes it into `backups/postgres`.
  - restore drill runs successfully.
  - offsite shipping status is documented:
    - `READY` if remote host + SSH key are configured;
    - `DEFERRED` otherwise.
- Monitoring/logging:
  - nginx/backend logs include correlation-id.
  - audit table receives admin write actions.
- Frontend deploy flow (FileZilla mode):
  - `npm run build --workspace @platform/frontend`
  - upload `platform/infra/nginx/static`
  - `docker compose up -d --force-recreate nginx`

## Handover Artifacts

- `docs/cicd.md`
- `docs/phase9-final-verification.md`
- `docs/postgres-backup.md`
- `platform/infra/server/README.md`
