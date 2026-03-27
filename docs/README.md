# Docs Index

## Purpose

Central navigation for platform runbooks and phase documentation.

## By Phase

- Phase 6:
  - `docs/module-onboarding.md`
  - `docs/module-deploy-smoke.md`
- Phase 7:
  - `docs/security-phase7-baseline.md`
  - `docs/audit-logging.md`
  - `docs/correlation-id.md`
- Phase 9:
  - `docs/cicd.md`
  - `docs/frontend-static-deploy.md`
  - `docs/backend-infra-deploy.md`
  - `docs/new-ip-migration.md`
  - `docs/phase9-final-verification.md`
  - `docs/postgres-backup.md`
  - `docs/handover-checklist.md`
  - `docs/production-launch-runbook.md`

## By Scenario

- Project map for LLM/dev onboarding:
  - `docs/LLM_PROJECT_MAP.md`
- Current system state for LLM/dev onboarding:
  - `docs/LLM_SYSTEM_STATE.md`
- Landing/portfolio development plan:
  - `docs/landing-portfolio-roadmap.md`
- Add new module:
  - `docs/module-onboarding.md`
- Deploy and quick verify:
  - `docs/module-deploy-smoke.md`
- CI/CD setup and environment deploy:
  - `docs/cicd.md`
- Frontend-only deploy:
  - `docs/frontend-static-deploy.md`
- Backend/nginx/compose deploy:
  - `docs/backend-infra-deploy.md`
- Migration to a new IP:
  - `docs/new-ip-migration.md`
- Full final smoke verification:
  - `docs/phase9-final-verification.md`
- Backup, offsite sync, restore drill:
  - `docs/postgres-backup.md`
- Production handover and launch:
  - `docs/handover-checklist.md`
  - `docs/production-launch-runbook.md`
- Security and observability checks:
  - `docs/security-phase7-baseline.md`
  - `docs/audit-logging.md`
  - `docs/correlation-id.md`

## Server Scripts Reference

- `platform/infra/server/deploy-module-smoke.sh`
- `platform/infra/server/bootstrap-platform-stack.sh`
- `platform/infra/server/phase9-smoke.sh`
- `platform/infra/server/postgres-backup.sh`
- `platform/infra/server/postgres-backup-offsite.sh`
- `platform/infra/server/postgres-restore-drill.sh`
- `platform/infra/server/readiness-check.sh`
- `platform/infra/server/collect-platform-state.sh`
