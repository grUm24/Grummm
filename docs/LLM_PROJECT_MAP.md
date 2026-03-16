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
- `platform/frontend/FRONTEND_ARCHITECTURE.md` (frontend shell, routing, stores, UI composition)

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
- `docker-compose.yml`: local stack wiring.
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
      |- Analytics/
      |- PlatformOps/
      |- ProjectPosts/
      `- TaskTracker/
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
- `Contracts/*`: API DTO/contracts.
- `Validation/*`: request validation + validation exception.
- `appsettings.json`: backend config.

### `src/Core`
- Domain-level abstractions for auth, persistence, modules, audit and security.

### `src/Infrastructure`
- DI/bootstrap helpers.
- JWT and refresh token infrastructure.
- audit persistence/writer.
- persistence baselines and module schema helpers.

### `src/Modules/Analytics`
- Isolated analytics backend module.
- Owns contracts, handlers, persistence and module endpoints for public/admin analytics flows.

### `src/Modules/PlatformOps`
- Isolated platform operations backend module.
- Owns readiness/ops contracts, queries and endpoints instead of keeping that logic in WebAPI services.

### `src/Modules/ProjectPosts`
- Project post CRUD and template upload/runtime flow.
- Public read endpoints and private admin endpoints.
- Explicit upload DTO mapping for mass-assignment protection.
- Template runtime support for Static/JavaScript/CSharp/Python.

### `src/Modules/TaskTracker`
- Task tracker module with commands, queries, validation and module-specific persistence abstractions.

### `platform/backend/tests`
- xUnit coverage for ProjectPosts upload/runtime flow.
- Tests for dynamic viewer routing and template upload behavior.

## 5. Frontend Map (`platform/frontend`)

```text
platform/frontend/
|- FRONTEND_ARCHITECTURE.md
|- FRONTEND_STRUCTURE.md
|- package.json
|- vite.config.ts
|- tsconfig.json
|- index.html
`- src/
   |- main.tsx
   |- styles.css
   |- core/
   |- public/
   |- shared/
   `- modules/
```

### `src/main.tsx`
- Restores auth session from `localStorage`.
- Boots the root React tree.
- Mounts `AppRouter`.

### `src/core`
- `auth/auth-session.tsx`: auth state/provider.
- `routing/AppRouter.tsx`: nested route tree with persistent layout shells.
- `routing/ProtectedRoute.tsx`: private route guard.
- `layouts/PublicLayout.tsx`: public persistent shell.
- `layouts/PrivateAppLayout.tsx`: private persistent shell.
- `pages/*`: admin pages and dynamic private viewer.
- `plugin-registry/*`: auto-discovery of frontend modules.

### `src/public`
- `pages/LandingPage.tsx`: public landing page.
- `pages/ProjectsPage.tsx`: project catalog.
- `pages/PostsPage.tsx`: posts catalog.
- `pages/ProjectDetailPage.tsx`: split detail flow for runtime projects and editorial posts.
- `components/PublicHeader.tsx`: public navigation + preferences panel.
- `components/LandingHeroSection.tsx`: hero split-layout.
- `components/ProjectCard.tsx`: shared card UI for posts/projects.
- `components/PostContentRenderer.tsx`: structured post body renderer.
- `components/RelatedEntriesSection.tsx`: related posts/projects footer.
- `components/ProjectDetailSummary.tsx`: project-only editorial summary layout.
- `data/project-store.ts`: API-first public/admin store with fallback and block-type normalization.
- `data/landing-content-store.ts`: API-first landing content store.
- `preferences.tsx`: theme/language provider and persistence.
- `types.ts`: shared public types.

### `src/shared`
- `i18n/*`: built-in RU/EN dictionaries and translation helpers.
- `ui/useGsapEnhancements.ts`: GSAP reveal/stagger/button motion helper.

### `src/modules/task-tracker`
- Frontend module registration metadata and public/private pages for TaskTracker.

### Frontend Tests
- `src/core/components/AdminPostBlocksEditor.tsx`: block-based admin post editor.
- `src/core/pages/AdminProjectsWorkspace.test.tsx`
- `src/core/routing/AppRouter.dynamic-viewer.test.tsx`
- `src/public/components/ProjectCard.test.tsx`
- Cypress config and e2e flows in frontend workspace.

## 6. Infra Map (`platform/infra`)

```text
platform/infra/
|- nginx/
|- postgres/
`- server/
```

### `nginx`
- reverse proxy, security headers, limits, SPA fallback, dynamic `/app/{slug}/...` asset serving.

### `postgres`
- postgres image customization used by compose.

### `server`
- bootstrap/hardening scripts.
- smoke and readiness checks.
- backup and restore drill scripts.
- state collection and reporting scripts.

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

- Public web: `/`, `/projects`, `/projects/:id`, `/posts`, `/posts/:id`
- Private web: `/app`, `/app/:module`, `/app/:module/*`
- Public API: `/api/public/*`
- Private API: `/api/app/*`

These boundaries are architectural constraints.

## 9. Frontend Reset Status

Important current state:
- business logic and stores were intentionally preserved
- frontend HTML composition was rebuilt around persistent layout shells
- theme and language switching were preserved
- motion is now a thin GSAP enhancement layer instead of a routing mechanism
- documentation for the current frontend lives primarily in `platform/frontend/FRONTEND_ARCHITECTURE.md`

## 10. Quick Start for Another LLM

When assisting in this repo:
- preserve module boundaries
- keep business logic outside controllers/layout shells
- preserve public/private zone split
- preserve plugin auto-registration on backend and frontend
- do not bypass `preferences.tsx` or `shared/i18n/*` for theme/language changes
- update docs when router/layout/store contracts change
