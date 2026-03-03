# LLM Project Map (Grummm)

## 1. Project in One Minute

- Type: monorepo, modular monolith platform.
- Backend: ASP.NET Core 9 (`platform/backend`).
- Frontend: React + TypeScript + Vite (`platform/frontend`).
- Infra: Docker Compose + Nginx + server scripts (`platform/infra`).
- Docs/runbooks: `docs/`.

Main architecture and state snapshot:
- `ai-context.md` (current phase/state, constraints, roadmap)
- `architecture-lock.md` (locked architecture decisions)
- `module-contract.md` (module boundary and contract notes)

## 2. Top-Level Layout

```text
.
|- docs/
|- platform/
|  |- backend/
|  |- frontend/
|  `- infra/
|- docker-compose.yml
|- docker-compose.deploy.yml
|- Grummm.sln
|- package.json
|- README.md
`- ai-context.md
```

## 3. Core Entry Files

- `README.md`: short repo summary.
- `docs/README.md`: docs index by phase/scenario.
- `docker-compose.yml`: local stack wiring (backend, frontend/nginx, postgres).
- `docker-compose.deploy.yml`: deploy override.
- `Grummm.sln`: .NET solution for backend projects.
- `package.json`: root workspace scripts.

## 4. Backend Map (`platform/backend`)

```text
platform/backend/
|- Dockerfile
`- src/
   |- WebAPI/
   |- Core/
   |- Infrastructure/
   `- Modules/
      |- TaskTracker/
      `- ProjectPosts/
```

### `src/WebAPI`
- `Program.cs`: app startup, middleware pipeline, endpoint mapping.
- `Extensions/ModuleRegistrationExtensions.cs`: module registration/mapping.
- `Middleware/*`: cross-cutting concerns:
  - JWT auth
  - CSRF protection
  - correlation id
  - global exception handling
  - admin audit logging
- `Contracts/*`: API DTO/contracts (auth + cookies).
- `Validation/*`: request validation + validation exception.
- `appsettings.json`: backend config.

### `src/Core`
- `Contracts/*`: domain-level abstractions for auth, persistence, modules, audit, security.
- `README.md`: purpose of core layer.

### `src/Infrastructure`
- `Extensions/*`: DI and integration bootstrap helpers.
- `Security/*`: JWT options validation, token services, refresh token store.
- `Audit/*`: audit entities/db context/writer/bootstrapping.
- `Persistence/*`: module schema/registry baseline.
- `README.md`: infra layer scope.

### `src/Modules/TaskTracker`
- `TaskTrackerModule.cs`: module entry for backend registration.
- `Domain/TaskItem.cs`: aggregate/entity model.
- `Application/Commands/*`: create/complete task use cases.
- `Application/Queries/*`: fetch tasks/task details.
- `Application/Validation/*`: module command validation.
- `Application/Repositories/ITaskItemRepository.cs`: module repository abstraction.
- `Infrastructure/Repositories/InMemoryTaskItemRepository.cs`: baseline repository impl.
- `Contracts/*`: module DTO/mapping.
- `README.md`: module behavior and routes.

### `src/Modules/ProjectPosts`
- `ProjectPostsModule.cs`: module entry, endpoint mapping, DTO normalization/validation.
- `ProjectPosts.Endpoints.cs`: route mapping including `POST /api/app/projects/{id}/upload-with-template`.
- `Domain/Entities/ProjectPost.cs`: project post entity and `TemplateType` enum.
- `Contracts/ProjectPostDtos.cs`: API contracts including template metadata fields.
- `Contracts/ProjectPostMappings.cs`: mapping between domain entity and DTO.
- `Contracts/UploadWithTemplateRequest.cs`: explicit upload DTO for multipart fields.
- `Contracts/UploadWithTemplateMappings.cs`: explicit DTO -> command mapping (mass-assignment protection).
- `Application/Commands/UploadWithTemplateCommand*.cs`: command, handler and template-aware validation.
- `Infrastructure/Security/ClamAv*.cs`: ClamAV options and malware scanner integration for upload flow.
- `Infrastructure/Repositories/PostgresProjectPostRepository.cs`: PostgreSQL persistence.
- `Infrastructure/Repositories/InMemoryProjectPostRepository.cs`: fallback persistence + seed.
- `Infrastructure/Persistence/Migrations/20260303_add_template_metadata.sql`: DB migration for `template`, `frontend_path`, `backend_path`.

### `platform/backend/tests`
- `ProjectPosts.Tests/InMemoryProjectPostRepositoryTests.cs`: baseline test for `TemplateType` + path persistence.
- `ProjectPosts.Tests/UploadWithTemplateEndpointTests.cs`: multipart upload endpoint tests for invalid(400)/valid(update metadata) flows.

## 5. Frontend Map (`platform/frontend`)

```text
platform/frontend/
|- package.json
|- vite.config.ts
|- tsconfig.json
|- index.html
`- src/
   |- main.tsx
   |- core/
   `- modules/
      `- task-tracker/
```

### `src/core`
- `auth/auth-session.tsx`: auth session state/provider.
- `routing/AppRouter.tsx`: global routes.
- `routing/ProtectedRoute.tsx`: private route guard for `/app/*`.
- `layouts/PublicLayout.tsx`: public shell.
- `layouts/PrivateAppLayout.tsx`: private app shell.
- `pages/AdminProjectsWorkspace.tsx`: admin CRUD UI for project posts, template dropdown, conditional upload instructions, frontend/backend dropzones.
- `pages/DynamicProjectViewer.tsx`: private dynamic viewer for `/app/:slug` (iframe to uploaded bundle index).
- `plugin-registry/module-contract.ts`: frontend module contract.
- `plugin-registry/registry.ts`: auto-discovery via `import.meta.glob`.
- `README.md`: frontend core baseline notes.

### `src/public`
- `pages/LandingPage.tsx`: public landing with hero and featured portfolio cards.
- `pages/ProjectsPage.tsx`: full portfolio listing page.
- `pages/ProjectDetailPage.tsx`: project details page.
- `components/RotatingEarth.tsx`: CSS/DOM animated 2D Earth with orbit labels (no 3D libs).
- `components/ProjectCard.tsx`: responsive expandable project cards.
- `data/projects.ts`: bilingual portfolio data and themed assets.
- `data/project-store.ts`: public/admin project data store, API sync, multipart upload attempt (FormData) + JSON fallback, fetch by slug.
- `preferences.tsx`: public theme/language state and persistence.
- `hooks/useSwipeBack.ts`: mobile swipe-back helper for public pages.
- `types.ts`: shared `PortfolioProject` type including template metadata fields (`template`, `frontendPath`, `backendPath`).

### `src/modules/task-tracker`
- `task-tracker.module.tsx`: module registration metadata.
- `TaskTrackerPublicPage.tsx`: public project page.
- `TaskTrackerPrivatePage.tsx`: private module home.
- `TaskTrackerCreatePage.tsx`: create task page.
- `TaskTrackerBoardPage.tsx`: board/list page.

### `src/modules/README.md`
- Rules for adding new frontend modules and route boundaries.

### Frontend Tests
- `src/core/pages/AdminProjectsWorkspace.test.tsx`: verifies conditional template UI rendering (example: `Python` instructions).
- `src/core/routing/AppRouter.dynamic-viewer.test.tsx`: verifies dynamic private route `/app/:slug`.

## 6. Infra Map (`platform/infra`)

```text
platform/infra/
|- nginx/
|- postgres/
`- server/
```

### `nginx`
- `default.conf`: reverse proxy, security headers, limits, SPA fallback, dynamic `/app/{slug}/...` asset serving from `/var/projects/{slug}/frontend`.
- `docker-entrypoint.sh`: cert/bootstrap logic.
- `Dockerfile`: nginx image setup.
- `static/index.html`: static fallback page.
- `README.md`: nginx/security/correlation baseline.

### `postgres`
- `Dockerfile`: postgres image customization used by compose.

### `server`
- `bootstrap-ubuntu.sh`: baseline Ubuntu hardening.
- `verify-ubuntu-hardening.sh`: hardening verification.
- `deploy-module-smoke.sh`: module deployment smoke check + nginx reload.
- `phase9-smoke.sh`: full phase smoke verification.
- `postgres-backup.sh`: local backup flow.
- `postgres-backup-offsite.sh`: offsite backup shipping flow.
- `postgres-restore-drill.sh`: restore drill script.
- `readiness-check.sh`: one-shot readiness report.
- `collect-platform-state.sh`: consolidated server state report.
- `README.md`: operational usage and examples.

## 7. Docs Map (`docs`)

- `README.md`: docs navigation.
- `module-onboarding.md`: how to add a new module.
- `module-deploy-smoke.md`: deployment smoke flow.
- `security-phase7-baseline.md`: security baseline checklist.
- `audit-logging.md`: audit logging baseline.
- `correlation-id.md`: correlation id flow.
- `cicd.md`: CI/CD pipeline guide.
- `phase9-final-verification.md`: final verification procedure.
- `postgres-backup.md`: backup/retention/restore notes.
- `handover-checklist.md`: production handover checklist.
- `production-launch-runbook.md`: launch runbook.

## 8. Routing Boundaries (Important)

- Public web: `/`, `/projects`, `/projects/:id`
- Private web: `/app`, `/app/:module`, `/app/:module/*`
- Public API: `/api/public/*`
- Private API: `/api/app/*`

These boundaries are treated as architectural constraints.

## 9. Quick Start for Another LLM

When assisting in this repo:
- preserve module boundaries (no cross-module business dependencies),
- keep business logic outside controllers/UI routing,
- preserve public/private zone split,
- prefer extending contracts + module registration patterns already in place,
- update runbooks/docs when behavior or ops flow changes.
