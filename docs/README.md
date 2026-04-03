# Docs Index

## Purpose

Central navigation for platform runbooks, LLM onboarding, and phase documentation.

## LLM / Developer Onboarding

- `docs/LLM_SYSTEM_STATE.md` — **Start here.** Full system overview for LLMs and new developers.
- `docs/LLM_PROJECT_MAP.md` — Verified file-level map of the entire repo.
- `docs/developer-guide.docx` — Junior developer onboarding guide (DOCX).

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

- **System overview for LLM/dev:** `docs/LLM_SYSTEM_STATE.md`
- **Project file map:** `docs/LLM_PROJECT_MAP.md`
- **Add new module:** `docs/module-onboarding.md`
- **Deploy and quick verify:** `docs/module-deploy-smoke.md`
- **CI/CD setup:** `docs/cicd.md`
- **Frontend-only deploy:** `docs/frontend-static-deploy.md`
- **Backend/nginx/compose deploy:** `docs/backend-infra-deploy.md`
- **Migration to a new IP:** `docs/new-ip-migration.md`
- **Full smoke verification:** `docs/phase9-final-verification.md`
- **Backup/restore:** `docs/postgres-backup.md`
- **Production handover/launch:** `docs/handover-checklist.md`, `docs/production-launch-runbook.md`
- **Security and observability:** `docs/security-phase7-baseline.md`, `docs/audit-logging.md`, `docs/correlation-id.md`

## Root-Level Context Files

- `ai-context.md` — rolling feature/phase snapshot
- `architecture-lock.md` — locked architecture decisions
- `module-contract.md` — module boundary rules
- `llm-rules.md` — hard constraints for LLMs
- `dev-state.md` — current development state and tasks
- `ENVIRONMENT.md` — dev environment setup
- `AGENTS.md` — AI assistant onboarding

## Server Scripts Reference

- `platform/infra/server/deploy-module-smoke.sh`
- `platform/infra/server/bootstrap-platform-stack.sh`
- `platform/infra/server/phase9-smoke.sh`
- `platform/infra/server/postgres-backup.sh`
- `platform/infra/server/postgres-backup-offsite.sh`
- `platform/infra/server/postgres-restore-drill.sh`
- `platform/infra/server/readiness-check.sh`
- `platform/infra/server/collect-platform-state.sh`
