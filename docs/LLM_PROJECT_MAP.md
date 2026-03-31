# LLM Project Map (Grummm)

> Verified file-level map of the entire repository. Use alongside `docs/LLM_SYSTEM_STATE.md` for the best context.

## 1. Project in One Minute

- **Type:** monorepo, modular monolith platform
- **Backend:** ASP.NET Core 9 (`platform/backend`)
- **Frontend:** React + TypeScript + Vite (`platform/frontend`)
- **Infra:** Docker Compose (base + overlay) + Nginx + server scripts (`platform/infra`)
- **Docs/runbooks:** `docs/`

Key context files:
- `docs/LLM_SYSTEM_STATE.md` — system behavior, runtime flows, deploy model, sharp edges
- `ai-context.md` — rolling feature/phase snapshot
- `architecture-lock.md` — locked architecture decisions
- `module-contract.md` — module boundary rules
- `llm-rules.md` — hard constraints for LLMs

## 2. Top-Level Layout

```text
.
|- .github/workflows/      CI/CD pipeline
|- docs/                    Runbooks, maps, onboarding
|- platform/
|  |- backend/              ASP.NET Core 9 modular monolith
|  |- frontend/             React + TS + Vite SPA
|  `- infra/                Nginx, postgres, server scripts
|- scripts/                 Dev utilities (dev.sh, generate-dev-guide.mjs)
|- docker-compose.yml       Base compose (shared structure)
|- docker-compose.deploy.yml Production overlay
|- docker-compose.dev.yml   Development overlay
|- .env.dev                 Dev environment vars (safe to commit)
|- .env.prod.example        Production env template
|- Grummm.sln               .NET solution
|- package.json             Root workspace scripts
`- ai-context.md            Rolling state snapshot
```

## 3. Backend Map (`platform/backend`)

```text
platform/backend/
|- Dockerfile               Production multi-stage build
|- Dockerfile.dev           Dev build (not used — dotnet watch crashes on Windows volumes)
`- src/
   |- WebAPI/               App entrypoint, middleware, endpoints, config
   |- Core/                 Domain abstractions (auth, modules, audit, persistence)
   |- Infrastructure/       DI helpers, JWT/refresh services, audit persistence
   `- Modules/
      |- Analytics/         Public/admin analytics
      |- PlatformOps/       Readiness, backups, ops
      |- ProjectPosts/      Core content module (projects, posts, topics, relations)
      `- TaskTracker/       Demo task tracker module
```

### `src/WebAPI` — Application Host

| File | Purpose |
|------|---------|
| `Program.cs` | Startup, middleware pipeline, endpoint mapping, DI registration |
| `appsettings.json` | Base config (JWT, rate limits) |
| `appsettings.Development.json` | Dev config (simple creds, relaxed cookies, dev DB) |
| `appsettings.Production.json` | Prod config (warning-level logging) |
| `Middleware/JwtAuthenticationMiddleware.cs` | Bearer token validation |
| `Middleware/CsrfProtectionMiddleware.cs` | CSRF enforcement |
| `Middleware/AdminAuditMiddleware.cs` | Audit logging for admin actions |
| `Middleware/CorrelationIdMiddleware.cs` | Request correlation |
| `Middleware/GlobalExceptionMiddleware.cs` | Global error handling |
| `Extensions/AuthCookieExtensions.cs` | Refresh token cookie management (env-aware) |
| `Extensions/ModuleRegistrationExtensions.cs` | Module discovery and registration |
| `Contracts/AuthCookieOptions.cs` | Cookie config (name, path, secure, samesite) |
| `Contracts/AuthRequests.cs` | Login/refresh request DTOs |

### `src/Infrastructure/Security` — Auth Infrastructure

| File | Purpose |
|------|---------|
| `JwtTokenService.cs` | JWT creation and validation (HS256) |
| `RefreshTokenService.cs` | Token issuance, rotation, revocation with family tracking |
| `PostgresRefreshTokenStore.cs` | **Persistent** refresh token storage (auto-creates `refresh_tokens` table) |
| `InMemoryRefreshTokenStore.cs` | Fallback when no DB connection string |
| `AdminSecurityService.cs` | Credential validation, PBKDF2-SHA256, email codes |
| `JwtOptions.cs` | JWT configuration (issuer, audience, key, lifetimes) |

### `src/Modules/ProjectPosts` — Core Content Module

| File | Purpose |
|------|---------|
| `ProjectPosts.Endpoints.cs` | All API endpoints (public + admin + topics + relations) |
| `ProjectPostsModule.cs` | Module registration and DI |
| `Contracts/ProjectPostDtos.cs` | DTOs including `TopicDto`, `RelatedProjectDto`, etc. |
| `Domain/Entities/ProjectPost.cs` | Domain entity |
| `Application/Repositories/IProjectPostRepository.cs` | Repository interface (9 methods for topics/relations) |
| `Infrastructure/Repositories/PostgresProjectPostRepository.cs` | PostgreSQL implementation with auto-migration |
| `Infrastructure/Repositories/InMemoryProjectPostRepository.cs` | In-memory fallback |

**Database tables (auto-migrated):**
- `project_posts` — main content
- `topics` — global topics (id, name_en, name_ru)
- `project_topics` — many-to-many project ↔ topic
- `project_relations` — source_id → target_id (bidirectional via UNION)
- `landing_content` — landing page content blocks
- `refresh_tokens` — refresh token persistence (in Infrastructure, separate from ProjectPosts)

## 4. Frontend Map (`platform/frontend`)

```text
platform/frontend/
|- vite.config.ts           Build config + dev API proxy
|- tsconfig.json
|- index.html               Semantic fallback shell + preloader
|- public/                  Static assets (preload.css/js, robots.txt, sitemap.xml)
`- src/
   |- main.tsx              Auth bootstrap, React mount
   |- styles.css            Single global stylesheet
   |- core/                 Auth, layouts, routing, admin pages, components
   |- public/               Public pages, components, store, types, preferences
   |- shared/               i18n, SEO helpers, GSAP motion
   `- modules/              Auto-discovered plugins (task-tracker)
```

### `src/core` — App Shell

| File | Purpose |
|------|---------|
| `auth/auth-session.tsx` | Auth context with `bootstrapping` state, in-memory token storage |
| `auth/auth-api.ts` | Login, refresh, confirm-session, logout, email code requests |
| `routing/AppRouter.tsx` | Route tree, auth bootstrap effect, reauth dialog |
| `routing/ProtectedRoute.tsx` | Auth guard (waits for bootstrap before deciding) |
| `layouts/PublicLayout.tsx` | Public persistent shell |
| `layouts/PrivateAppLayout.tsx` | Private persistent shell |
| `pages/AdminProjectsWorkspace.tsx` | Project/post editor + topics manager + relations selector |
| `pages/AdminOverviewPage.tsx` | Admin dashboard |
| `pages/AdminLoginPage.tsx` | Login form |
| `pages/AdminSecurityPage.tsx` | Password change, security settings |
| `pages/AdminLandingContentPage.tsx` | Landing page content editor |
| `pages/DynamicProjectViewer.tsx` | Runtime project viewer |
| `components/AdminTopicsManager.tsx` | Topics CRUD (list, create, delete) |
| `components/AdminRelationsSelector.tsx` | Per-project topic chips + relation search/link |
| `components/AdminPostBlocksEditor.tsx` | Block-based post content editor |

### `src/public` — Public Site

| File | Purpose |
|------|---------|
| `pages/LandingPage.tsx` | Public landing |
| `pages/ProjectsPage.tsx` | Project catalog |
| `pages/PostsPage.tsx` | Posts catalog |
| `pages/ProjectDetailPage.tsx` | Detail page (server-fetched related entries, structured data) |
| `data/project-store.ts` | API-first store (projects + topics + relations + related entries) |
| `data/landing-content-store.ts` | Landing content store |
| `types.ts` | `PortfolioProject`, `Topic`, `RelatedEntry`, `LocalizedText`, etc. |
| `preferences.tsx` | Theme/language provider and persistence |
| `components/RelatedEntriesSection.tsx` | Related posts/projects cards |
| `components/PostContentRenderer.tsx` | Structured post body renderer |
| `components/ProjectScreensGallery.tsx` | Screenshot gallery with lightbox |
| `components/ProjectCard.tsx` | Shared card for posts/projects |

### `src/shared`

| File | Purpose |
|------|---------|
| `i18n/*` | RU/EN dictionaries and `t()` translation helper |
| `seo/useDocumentMetadata.ts` | Runtime meta tags, OG, structured data sync |
| `ui/useGsapEnhancements.ts` | GSAP reveal/stagger/motion |

## 5. Infra Map (`platform/infra`)

```text
platform/infra/
|- nginx/
|  |- default.conf          Production nginx (HTTPS, headers, proxy, SPA)
|  |- dev.conf              Dev nginx (HTTP, proxy to Vite + backend)
|  `- static/               Mirrored frontend dist for nginx image build
|- postgres/                Postgres image customization
`- server/                  Bootstrap, smoke, backup, readiness scripts
```

## 6. Docker Compose Files

| File | Use | Command |
|------|-----|---------|
| `docker-compose.yml` | Base (shared structure, no secrets) | Always included |
| `docker-compose.deploy.yml` | Production (GHCR images, prod env) | `-f docker-compose.yml -f docker-compose.deploy.yml` |
| `docker-compose.dev.yml` | Development (local build, Vite HMR, dev DB) | `-f docker-compose.yml -f docker-compose.dev.yml` |

## 7. Scripts

| File | Purpose |
|------|---------|
| `scripts/dev.sh` | Convenience wrapper for dev environment startup |
| `scripts/generate-dev-guide.mjs` | Generates `docs/developer-guide.docx` programmatically |

## 8. Docs Map (`docs/`)

| File | Topic |
|------|-------|
| `README.md` | Docs navigation index |
| `LLM_SYSTEM_STATE.md` | LLM quickstart (this file's companion) |
| `LLM_PROJECT_MAP.md` | This file |
| `module-onboarding.md` | How to add a new module |
| `module-deploy-smoke.md` | Deploy smoke flow |
| `cicd.md` | CI/CD pipeline guide |
| `security-phase7-baseline.md` | Security checklist |
| `audit-logging.md` | Audit logging baseline |
| `correlation-id.md` | Correlation ID flow |
| `postgres-backup.md` | Backup/retention/restore |
| `frontend-static-deploy.md` | Frontend-only deploy |
| `backend-infra-deploy.md` | Backend/infra deploy |
| `new-ip-migration.md` | Server migration guide |
| `handover-checklist.md` | Production handover |
| `production-launch-runbook.md` | Launch runbook |
| `developer-guide.docx` | Junior developer onboarding (DOCX) |

## 9. Routing Boundaries (Locked)

| Zone | Routes | Access |
|------|--------|--------|
| Public web | `/`, `/projects`, `/projects/:id`, `/posts`, `/posts/:id` | Anyone |
| Private web | `/app`, `/app/*` | Admin only |
| Public API | `/api/public/*` | Anyone |
| Private API | `/api/app/*` | JWT + AdminOnly |

## 10. Quick start for another LLM

When assisting in this repo:
- Preserve module boundaries (no cross-module business imports)
- Keep business logic outside controllers/layout shells
- Preserve public/private zone split
- Preserve plugin auto-registration on backend and frontend
- Do not bypass `preferences.tsx` or `shared/i18n/*` for theme/language
- Keep runtime metadata aligned with `index.html` on public pages
- Keep nginx conf UTF-8 without BOM
- Refresh tokens are PostgreSQL-persisted; don't revert to memory-only
- Topics/relations use raw Npgsql (not EF Core) in ProjectPosts module
- Update docs when router/layout/store contracts change
