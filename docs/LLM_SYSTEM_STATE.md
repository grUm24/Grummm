# LLM System State Guide

Last updated: 2026-03-30

Purpose: this file is the **fastest accurate way** to load an LLM into the current state of `Grummm` without re-discovering the repository. Read this first, then drill into specific files as needed.

**Quick-reference chain:**
1. **This file** — system overview, architecture, runtime flows, sharp edges
2. `docs/LLM_PROJECT_MAP.md` — verified file-level map of the entire repo
3. `ai-context.md` — rolling snapshot of features and phase state
4. `architecture-lock.md`, `module-contract.md`, `llm-rules.md` — hard constraints

---

## 1. What this project is

`Grummm` is a **modular monolith platform** for publishing projects and editorial posts, with an admin workspace and optional sandboxed public demos.

| Layer | Tech | Location |
|-------|------|----------|
| Backend | ASP.NET Core 9 / .NET 9, raw Npgsql | `platform/backend/` |
| Frontend | React 18 + TypeScript + Vite 5 | `platform/frontend/` |
| Database | PostgreSQL | via Docker Compose |
| Proxy | Nginx | `platform/infra/nginx/` |
| Deploy | Docker Compose (base + overlay) | root `docker-compose*.yml` |
| CI/CD | GitHub Actions | `.github/workflows/pipeline.yml` |
| Auth | JWT (15 min) + refresh rotation (7 days, PostgreSQL-persisted) | |

## 2. Architecture at a glance

```
┌─────────────────────────────────────────────────────┐
│                     Nginx (443/80)                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ /api/*   │→ │ Backend  │  │ /var/projects/*   │  │
│  │ /health  │  │ :8080    │  │ (uploaded demos)  │  │
│  │ /ready   │  └────┬─────┘  └───────────────────┘  │
│  │ /sitemap │       │                                │
│  └──────────┘       ▼                                │
│              ┌──────────────┐                        │
│  Static SPA  │  PostgreSQL  │                        │
│  from dist/  │  :5432       │                        │
│              └──────────────┘                        │
└─────────────────────────────────────────────────────┘
```

## 3. Route and API boundaries (LOCKED)

These boundaries are **architectural constraints**. Never blur them.

| Zone | Routes | Guard | Layout |
|------|--------|-------|--------|
| Public web | `/`, `/projects`, `/projects/:id`, `/posts`, `/posts/:id` | none | `PublicLayout` |
| Private web | `/app`, `/app/*` | `ProtectedRoute` (AdminOnly) | `PrivateAppLayout` |
| Public API | `/api/public/*` | none | — |
| Private API | `/api/app/*` | JWT + AdminOnly policy | — |

## 4. Backend structure

**Entrypoint:** `platform/backend/src/WebAPI/Program.cs`

### Backend modules (under `platform/backend/src/Modules/`)

| Module | Purpose |
|--------|---------|
| `ProjectPosts` | Core content module: projects, posts, topics, relations, recommendations, sitemap |
| `Analytics` | Public/admin analytics (site visits, post views) |
| `PlatformOps` | Readiness checks, DB backups, ops endpoints |
| `TaskTracker` | Simple task tracker (demo module) |

### ProjectPosts — the main module

**Domain entities:**
- `ProjectPost` — unified entity for both posts and projects
  - `Kind`: `Post` or `Project`
  - `Visibility`: `Public`, `Private`, or `Demo`
  - Fields: Title, Summary, Description, Tags, HeroImage, Screenshots, VideoUrl, ContentBlocks, PublishedAt, PublicDemoEnabled, Template, FrontendPath, BackendPath

**Database tables (auto-migrated via `CREATE TABLE IF NOT EXISTS`):**
- `project_posts` — main content table
- `topics` — global topics (id, name_en, name_ru)
- `project_topics` — many-to-many: project ↔ topic
- `project_relations` — directional pairs, queried bidirectionally via UNION
- `landing_content` — landing page content blocks
- `refresh_tokens` — JWT refresh token persistence (in Infrastructure, not ProjectPosts)

**API endpoints (ProjectPosts):**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/public/projects` | — | List public entries |
| GET | `/api/public/projects/{id}` | — | Get single entry |
| GET | `/api/public/projects/{id}/related` | — | Server-computed recommendations |
| GET | `/api/app/topics` | Admin | List all topics |
| POST | `/api/app/topics` | Admin | Create/update topic |
| DELETE | `/api/app/topics/{id}` | Admin | Delete topic |
| GET | `/api/app/projects/{id}/relations` | Admin | Get project relations |
| PUT | `/api/app/projects/{id}/relations` | Admin | Set project relations |
| GET | `/api/app/projects/{id}/topics` | Admin | Get project topics |
| PUT | `/api/app/projects/{id}/topics` | Admin | Set project topics |
| POST | `/api/app/projects/{id}` | Admin | Create/update entry |
| DELETE | `/api/app/projects/{id}` | Admin | Delete entry |
| POST | `/api/app/projects/{id}/upload-with-template` | Admin | Upload project bundle |

**Recommendation algorithm:**
```
Score per candidate:
  +100  if explicitly linked via project_relations
  +10   per shared topic via project_topics
  +1    if same kind (post↔post or project↔project)
Filter: exclude current item, exclude private entries
Order: score DESC, limit 6
```

### Auth system

| Component | Location |
|-----------|----------|
| JWT generation/validation | `Infrastructure/Security/JwtTokenService.cs` |
| Refresh token service | `Infrastructure/Security/RefreshTokenService.cs` |
| Refresh token store (PostgreSQL) | `Infrastructure/Security/PostgresRefreshTokenStore.cs` |
| Refresh token store (fallback) | `Infrastructure/Security/InMemoryRefreshTokenStore.cs` |
| Cookie handling | `WebAPI/Extensions/AuthCookieExtensions.cs` |
| Auth endpoints | `Program.cs` (login, refresh, confirm-session, logout) |

**Token flow:**
1. Login → validates credentials + email code → issues access token (body) + refresh token (HttpOnly cookie)
2. Refresh → reads cookie → rotates refresh token → returns new access token
3. On page refresh → frontend calls `/api/public/auth/refresh` → restores session
4. On access token expiry → reauth modal (email + code)

**Cookie configuration:**
- Production: `__Host-platform-rt`, `Secure: true`, `SameSite: Strict`
- Development: `platform-rt`, `Secure: false`, `SameSite: Lax`

## 5. Frontend structure

**Entrypoint:** `platform/frontend/src/main.tsx`
**Router:** `platform/frontend/src/core/routing/AppRouter.tsx`

### Four source areas

| Area | Path | Purpose |
|------|------|---------|
| `src/core` | Auth, layouts, router, admin pages, plugin registry | App shell |
| `src/public` | Public pages, components, store, preferences, types | Public site |
| `src/shared` | i18n, SEO helpers, GSAP motion hook | Cross-cutting |
| `src/modules` | Auto-discovered feature modules (e.g. task-tracker) | Plugins |

### Key frontend files

| File | What it does |
|------|-------------|
| `core/auth/auth-session.tsx` | Auth context, in-memory token storage, bootstrapping state |
| `core/auth/auth-api.ts` | Login, refresh, confirm-session, logout API calls |
| `core/routing/AppRouter.tsx` | Route tree, auth bootstrap, reauth dialog |
| `core/routing/ProtectedRoute.tsx` | Auth guard (waits for bootstrap, then checks auth) |
| `core/pages/AdminProjectsWorkspace.tsx` | Project/post editor with topics and relations UI |
| `core/components/AdminTopicsManager.tsx` | Global topics CRUD |
| `core/components/AdminRelationsSelector.tsx` | Per-project topic chips + relation search/link |
| `public/data/project-store.ts` | API-first store with localStorage fallback, 8 topics/relations API functions |
| `public/pages/ProjectDetailPage.tsx` | Detail page with server-fetched related entries |
| `public/types.ts` | `PortfolioProject`, `Topic`, `RelatedEntry` types |
| `public/components/RelatedEntriesSection.tsx` | Related posts/projects cards at bottom of detail pages |

### Frontend auth bootstrap flow (critical)

```
1. Page loads → main.tsx reads localStorage → {isAuthenticated, role, email} (NO token)
2. AppRouter mounts → detects isAuthenticated but no token → sets bootstrapping=true
3. Calls POST /api/public/auth/refresh (cookie sent automatically)
4. Success → stores new access token in memory, bootstrapping=false
5. Failure → signOut, clears localStorage, bootstrapping=false
6. ProtectedRoute → if bootstrapping, renders null (waits); if !authenticated, redirects to /login
```

## 6. Environment separation

### Docker Compose overlay strategy

| File | Purpose | Contains secrets? |
|------|---------|-------------------|
| `docker-compose.yml` | Base services (structure only) | No |
| `docker-compose.deploy.yml` | Production overlay (GHCR images, prod env vars) | References `.env.backend.local` |
| `docker-compose.dev.yml` | Dev overlay (local build, Vite HMR, dev DB) | No (uses inline dev creds) |

**Dev startup:**
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

**Dev environment specifics:**
- Frontend: Vite dev server on port 5173 with HMR and API proxy to backend
- Backend: standard Dockerfile (NOT dotnet watch — crashes on Windows Docker volumes)
- Database: `platform_dev` with simple credentials
- Email verification: disabled
- Admin credentials: `admin` / `admin123`

### Config files by environment

| File | Environment | Purpose |
|------|------------|---------|
| `.env.dev` | Dev | Docker env vars (safe to commit) |
| `.env.prod.example` | Prod template | Shows required prod vars |
| `.env.backend.local` | Prod | Actual secrets (gitignored) |
| `appsettings.Development.json` | Dev | Dev DB, simple auth, relaxed cookies |
| `appsettings.Production.json` | Prod | Warning-level logging |

## 7. Runtime flows

### Public visitor
1. Nginx serves SPA from `platform/frontend/dist`
2. React mounts, loads content via `/api/public/*`
3. Detail pages fetch related entries via `/api/public/projects/{id}/related`
4. Analytics events sent for visits and post views

### Admin content editing
1. Login with credentials + email verification code
2. Navigate to `/app/posts` or `/app/projects`
3. Edit content, assign topics, link related entries
4. Save via private API → store resyncs

### Public demo
1. Admin uploads static bundle for a project
2. Sets visibility to `Demo` + `publicDemoEnabled: true`
3. Public detail shows CTA → viewer at `/{slug}/viewer/`

## 8. CI/CD and Git workflow

- **Branch protection:** main requires PR + 1 approving review
- **CI:** GitHub Actions — builds backend and frontend on every PR
- **CD:** On merge to main → build Docker images → push to GHCR → deploy to production
- **Developer onboarding:** `docs/developer-guide.docx` (16KB DOCX)

## 9. Known sharp edges

1. `platform/infra/nginx/default.conf` — must be UTF-8 without BOM (breaks nginx)
2. SQL in `EnsureSchemaAsync` — no backtick fragments (breaks PostgreSQL)
3. `dotnet watch` — crashes on Windows Docker volumes (PollingDirectoryWatcher duplicate key bug)
4. Frontend deploy — depends on fresh `dist/` mounted into nginx
5. Browser cache — hard reload often needed after deploy
6. InMemoryRefreshTokenStore — still used as fallback when no connection string is configured

## 10. Where to change things

| Task | Files |
|------|-------|
| Add/change public route | `core/routing/AppRouter.tsx`, `public/pages/*` |
| Change admin editor | `core/pages/AdminProjectsWorkspace.tsx`, `core/components/Admin*.tsx` |
| Change content model | `public/types.ts`, `Modules/ProjectPosts/Contracts/ProjectPostDtos.cs` |
| Change recommendations | `PostgresProjectPostRepository.cs` (SQL CTEs), `project-store.ts` |
| Change auth flow | `auth-session.tsx`, `auth-api.ts`, `AppRouter.tsx`, `ProtectedRoute.tsx` |
| Change topics/relations | `AdminTopicsManager.tsx`, `AdminRelationsSelector.tsx`, `ProjectPosts.Endpoints.cs` |
| Change deploy | `docker-compose*.yml`, `platform/infra/nginx/default.conf` |
| Change SEO | `index.html`, `prerender-seo.mjs`, `useDocumentMetadata.ts` |

## 11. Commands

```bash
# Dev environment
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Frontend
npm run dev --workspace @platform/frontend
npm run build --workspace @platform/frontend
npm run typecheck --workspace @platform/frontend
npm run test --workspace @platform/frontend

# Backend (requires dotnet SDK)
dotnet build platform/backend/src/WebAPI/WebAPI.csproj --configuration Release
dotnet test platform/backend/tests/ProjectPosts.Tests/ProjectPosts.Tests.csproj

# Production deploy
docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d
```
