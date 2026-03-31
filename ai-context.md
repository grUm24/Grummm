# AI CONTEXT - PLATFORM STATE

Last Updated: 2026-03-30
Version: 9.0
Phase: 12.x (topics & relations, dev/prod environment separation, auth persistence)

> The repository is Grummm Platform. Older notes about earlier frontend experiments are not authoritative.

---

## 1. System Overview

Architecture: Modular Monolith
Backend: ASP.NET Core 9 / .NET 9
Frontend: React + TypeScript + Vite 5
Database: PostgreSQL (raw Npgsql for ProjectPosts module, EF Core for audit)
Proxy: Nginx
Deployment: Docker Compose (base + overlay strategy)
Auth: JWT access tokens (15 min) + refresh token rotation (7 days, PostgreSQL-backed)

Project domain:
- Public showcase (`/`, `/projects`, `/projects/:id`, `/posts`, `/posts/:id`)
- Private admin workspace (`/app/*`)
- Dynamic template runtime host for interactive project entries
- Server-computed recommendations based on topics and explicit relations

## 2. Locked Route Zones

Public web:
- `/`
- `/projects`
- `/projects/:id`
- `/posts`
- `/posts/:id`

Private web:
- `/app`
- `/app/:module`
- `/app/:module/*`

Public API:
- `/api/public/*`

Private API:
- `/api/app/*` (`AdminOnly`)

## 3. Current Functional State

### 3.1 Public frontend

Implemented:
- landing page, separate project catalog, separate posts catalog, split detail pages
- persistent `PublicLayout` with compact public header (language/theme icon buttons)
- shared public footer across public routes, including mobile-specific centered action layout
- layered landing hero with desktop-only decorative scene and `HeroMorphTitle`
- CSP-safe preloader and semantic fallback shell in `index.html`
- runtime metadata sync through `useDocumentMetadata`
- post detail with structured content blocks, footer date and related entries
- project detail with summary, gallery, optional static public demo CTA
- **server-computed related entries** on both post and project detail pages (weighted scoring: explicit relations > shared topics > same kind)
- server-side invalid route handling targets static `__error_404.html`

### 3.2 Private admin frontend

Implemented:
- persistent `PrivateAppLayout`
- admin overview, posts editor, projects editor, content page, security page
- posts editor is block-based and stores EN/RU text separately
- post editor supports numbered lists, callouts, image blocks, and drag-and-drop uploaded video blocks
- projects editor keeps template, upload, screenshot and video controls project-only
- **topics manager** (CRUD for global topics: id, name EN/RU)
- **relations selector** (per-project: topic chips + searchable entry linking)
- custom template picker replaces native browser select

### 3.3 Data flow and content model

Current model:
- `PortfolioProject.kind` splits `post` and `project`
- `PortfolioProject.contentBlocks` stores structured post body blocks
- `PortfolioProject.publishedAt` is normalized for both posts and projects
- frontend store is API-first and falls back to `localStorage`

**Topics and relations model (new):**
- `topics` table: id, name_en, name_ru
- `project_topics` table: project_id, topic_id (many-to-many)
- `project_relations` table: source_id, target_id (bidirectional via UNION query)
- Recommendation algorithm: explicit relations (+100) > shared topics (+10 each) > same kind (+1)
- Public endpoint: `GET /api/public/projects/{id}/related`

Template/runtime flow:
- upload endpoint: `POST /api/app/projects/{id}/upload-with-template`
- Nginx serves uploaded frontend bundles under `/app/{slug}/...`
- dynamic backend dispatch stays under `/api/app/{slug}/*`
- public static demo is exposed through short route `/{slug}/viewer/`

### 3.4 Backend modules

Implemented:
- `TaskTracker`
- `ProjectPosts` (core content module)
- `Analytics`
- `PlatformOps`

`ProjectPosts` now owns:
- `kind`, `contentBlocks`, `publishedAt`, `publicDemoEnabled`
- repository-backed `/sitemap.xml`
- **topics CRUD** (3 endpoints under `/api/app/topics`)
- **project relations** (2 endpoints under `/api/app/projects/{id}/relations`)
- **project topics** (2 endpoints under `/api/app/projects/{id}/topics`)
- **public related entries** (1 endpoint: `/api/public/projects/{id}/related`)

### 3.5 Auth and session management

Architecture:
- JWT access tokens (15 min lifetime, HS256)
- Refresh token rotation with family tracking (7 days lifetime)
- **Refresh tokens persisted in PostgreSQL** (`refresh_tokens` table with auto-migration)
- Refresh token cookie: `__Host-platform-rt` (prod) / `platform-rt` (dev)
- Cookie settings are environment-aware: `Secure: true` + `SameSite: Strict` in prod, relaxed in dev
- CSRF cookie also environment-aware: `__Host-platform-csrf` (prod) / `platform-csrf` (dev)
- Frontend bootstrap: on page refresh, `ProtectedRoute` waits for refresh token rotation before deciding whether to redirect to login
- Reauth dialog opens when access token expires (user enters email + 6-digit code)

### 3.6 SEO and crawl surface

Implemented:
- `index.html` includes title, description, keywords, canonical and semantic fallback HTML
- frontend build runs `scripts/prerender-seo.mjs`
- production `/sitemap.xml` is dynamically generated by backend from DB
- post detail pages include BlogPosting + BreadcrumbList structured data (JSON-LD)
- static server-side `__error_404.html` for invalid routes

### 3.7 Environment separation

Architecture:
- `docker-compose.yml` - shared base (no secrets, no env-specific config)
- `docker-compose.deploy.yml` - production overlay (GHCR images, production env vars, secrets from `.env.backend.local`)
- `docker-compose.dev.yml` - development overlay (local build, Vite HMR on port 5173, dev database `platform_dev`, email verification disabled)
- `.env.dev` - dev environment variables (safe to commit)
- `.env.prod.example` - production template
- `appsettings.Development.json` - dev backend config (simple admin/admin123 credentials)
- `appsettings.Production.json` - prod backend config (warning-level logging)

### 3.8 Current deployment caveats

Important:
- `platform/infra/nginx/default.conf` must stay UTF-8 without BOM
- backend repository bootstrap SQL must not contain literal backtick escape fragments
- frontend deploy is still tied to the mounted `platform/frontend/dist` directory on the server
- dev environment does NOT have hot reload for backend (dotnet watch crashes on Windows Docker volumes due to PollingDirectoryWatcher duplicate key bug); use `--build` flag for backend changes

## 4. Security and operations baseline

Implemented baseline:
- JWT auth and refresh rotation (PostgreSQL-backed)
- `AdminOnly` protection for private routes and APIs
- CSRF strategy for unsafe requests (environment-aware cookie names)
- correlation-id propagation
- audit logging baseline
- rate limiting and security headers
- health/readiness and backup runbooks
- template upload validation and malware scanning
- GitHub branch protection: require PR + 1 approval for main

## 5. Developer workflow

- Git: branch protection on main, PRs required with review
- Second developer onboarding: `docs/developer-guide.docx`
- Dev environment: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`
- CI/CD: GitHub Actions pipeline (build on PR, deploy on merge to main)
