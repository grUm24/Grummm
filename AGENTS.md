# AGENTS.md

This file provides guidance to AI coding assistants (Warp, Cursor, Claude Code, etc.) when working with this repository.

## Key context docs

Read in this order for fastest onboarding:
1. `docs/LLM_SYSTEM_STATE.md` — system overview, architecture, runtime flows, sharp edges
2. `docs/LLM_PROJECT_MAP.md` — verified file-level map of the entire repo
3. `ai-context.md` — rolling feature/phase snapshot
4. `architecture-lock.md` — locked architectural constraints
5. `module-contract.md` — backend/frontend module contract rules
6. `llm-rules.md` — hard constraints for routing, layouts, module isolation, security
7. `docs/README.md` — runbook index and phase docs

## Common commands

### Frontend (workspace `@platform/frontend`)
- Dev server: `npm run dev --workspace @platform/frontend`
- Build: `npm run build --workspace @platform/frontend`
- Typecheck: `npm run typecheck --workspace @platform/frontend`
- Unit tests (Jest): `npm run test --workspace @platform/frontend`
- Watch tests: `npm run test:watch --workspace @platform/frontend`
- Single test file: `npm run test --workspace @platform/frontend -- AdminProjectsWorkspace.test.tsx`

### Backend (requires dotnet SDK — runs in Docker or CI)
- Build: `dotnet build platform/backend/src/WebAPI/WebAPI.csproj --configuration Release`
- Test: `dotnet test platform/backend/tests/ProjectPosts.Tests/ProjectPosts.Tests.csproj`

### Docker dev environment
- Start: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`
- Stop: `docker compose -f docker-compose.yml -f docker-compose.dev.yml down`

### Infra / ops scripts (server-side)
- Module deploy smoke: `chmod +x platform/infra/server/deploy-module-smoke.sh && ./platform/infra/server/deploy-module-smoke.sh`
- Phase 9 smoke: `chmod +x platform/infra/server/phase9-smoke.sh && BASE_URL=https://grummm.ru ROOT_DIR=/opt APP_DIR=/opt/platform ./platform/infra/server/phase9-smoke.sh`
- Postgres backup: `chmod +x platform/infra/server/postgres-backup.sh && ./platform/infra/server/postgres-backup.sh`

## Architecture overview

- **Modular monolith**: ASP.NET Core 9 backend + React/TS/Vite frontend; Docker Compose + Nginx + PostgreSQL.
- **Route zones are locked**: public web (`/`, `/projects`, `/projects/:id`, `/posts`, `/posts/:id`), private web (`/app/*`), public API (`/api/public/*`), private API (`/api/app/*`, `AdminOnly`).
- **Backend module system**: modules implement `IModule`, auto-registered via platform discovery; each module owns its persistence; cross-module references are prohibited.
- **Frontend plugin system**: modules under `platform/frontend/src/modules`, auto-discovered via `import.meta.glob` on `*.module.ts(x)`. Public pages in `PublicLayout`, private pages in `PrivateAppLayout` guarded by `ProtectedRoute`.
- **Auth**: JWT access tokens (15 min) + refresh token rotation (7 days). Refresh tokens persisted in PostgreSQL (`refresh_tokens` table). Cookie names are environment-aware.
- **Content model**: `ProjectPosts` module owns projects, posts, topics, relations, and recommendations. Uses raw Npgsql (not EF Core).
- **Docker Compose overlay**: base (`docker-compose.yml`) + prod (`docker-compose.deploy.yml`) + dev (`docker-compose.dev.yml`). Secrets only in deploy overlay.
- **Data flow**: frontend store is API-first with localStorage fallback. Topics/relations managed via admin UI, recommendations served via `/api/public/projects/{id}/related`.

## Hard constraints to preserve

- Keep module isolation; no cross-module business imports.
- Do not move business logic into controllers or layout wrappers.
- Keep DTO boundaries explicit; never expose persistence/domain entities directly.
- Preserve security baseline (CSRF, XSS, IDOR, mass-assignment, audit logging, correlation-id, rate limits).
- Preserve plugin auto-registration on both frontend and backend.
- Public pages in `PublicLayout`; private `/app/*` pages in `PrivateAppLayout` with auth guard.
- Refresh tokens must stay PostgreSQL-persisted; do not revert to memory-only.
- ProjectPosts uses raw Npgsql; keep this pattern for new tables in that module.
- Docker Compose overlay strategy; do not merge secrets into the base file.
- Any UX change that affects deploy must be reflected in docs smoke steps.
