# AI CONTEXT - PLATFORM STATE

Last Updated: 2026-03-16
Version: 7.6
Phase: 11.x (posts/projects split, structured post editor rollout)

> Important: the repository is the Grummm Platform. Older docs or history may still reference previous frontend experiments that are no longer current.

---

## 1. System Overview

Architecture: Modular Monolith
Backend: ASP.NET Core 9 / .NET 9
Frontend: React + TypeScript + Vite 5
Database: PostgreSQL
Proxy: Nginx
Deployment: Docker Compose

Project domain:
- Public portfolio platform (`/`, `/projects`, `/projects/:id`, `/posts`, `/posts/:id`)
- Private admin workspace (`/app/*`) for secure management tasks
- Dynamic template runtime host for interactive project posts

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

### 3.1 Public Frontend

Implemented:
- Landing page, separate projects listing, separate posts listing, and split detail pages
- Theme + language switching in public zone
- Persistent public shell through `PublicLayout`
- Landing hero rebuilt as a layered composition with desktop-only decorative scene
- Hero title uses `HeroMorphTitle.tsx`:
  - `Grummm` stays static
  - only the suffix phrase morphs on desktop
  - morphing is disabled on mobile and for `prefers-reduced-motion`
- Project detail remains media/text oriented
- Post detail is now structured article content:
  - title + summary in header
  - cover image and block-based body
  - related links to other posts and runtime projects at the bottom
- Responsive project interaction model:
  - cards expand first, then navigate on the next click/tap
  - tags are shown on cards, not inside post headers
  - mobile public pages support swipe-back helper behavior

### 3.2 Private Admin Frontend

Implemented:
- Persistent admin shell through `PrivateAppLayout`
- Admin overview, projects workspace, posts workspace, content page and security page
- Admin overview received a mobile-first layout pass for KPI density and quick actions
- Dynamic project viewer (`/app/:slug`)
- Session countdown, theme toggle, logout and responsive private navigation state

Posts workspace specifics:
- posts are no longer treated as projects without templates
- posts keep:
  - title
  - short summary
  - themed cover
  - tags
  - structured body blocks
- posts use `AdminPostBlocksEditor.tsx` with `+` block picker for:
  - paragraph
  - subheading
  - image
- each text block stores EN/RU content separately

Projects workspace specifics:
- runtime/template upload flow remains separate
- screenshots/video/template controls stay project-only

### 3.3 Projects Data Flow

Current flow (hybrid):
- Frontend store in `project-store.ts`
- Tries backend API first (`/api/public/projects`, `/api/app/projects`)
- Falls back to `localStorage` when API/token is unavailable

Important current contract:
- `PortfolioProject.kind` splits editorial posts from runtime projects
- `PortfolioProject.contentBlocks` stores structured post body blocks

Template flow:
- Upload endpoint: `POST /api/app/projects/{id}/upload-with-template`
- Nginx serves uploaded frontend from `/var/projects/{slug}/frontend` under `/app/{slug}/...`
- Embedded backend dispatch: `/api/app/{slug}/*`

### 3.4 Backend Modules

Implemented:
- `TaskTracker` module
- `ProjectPosts` module
- `Analytics` module
- `PlatformOps` module

`ProjectPosts` module now owns:
- `kind` (`post` / `project`)
- structured `contentBlocks`
- schema backfill for old rows through repository bootstrap and migration SQL

### 3.5 Test and Smoke Status

Implemented:
- Backend xUnit coverage for template upload flows
- Runtime load/call/unload checks for CSharp and Python
- Authorization checks for private template routes
- Frontend unit tests for workspace and dynamic viewer routes
- Cypress e2e baseline for `/app/projects` form and `/app/:slug` viewer
- Deploy smoke docs updated around dynamic app delivery

## 4. Security and Operations Baseline

Implemented baseline:
- JWT auth + refresh rotation
- `AdminOnly` private route/API protection
- CSRF strategy for cookie-based unsafe API requests
- correlation-id propagation
- audit logging middleware baseline
- rate limiting and security headers
- health/readiness and backup runbooks available

Template upload controls:
- explicit DTO-to-command mapping
- structure validation by template type
- malware scan before save
- correlation-id in upload/log flow

## 5. Immediate Next Steps (TASK-11)

1. Verify backend build in an environment where `dotnet` is available.
2. Add admin validation tests around post block editing and persistence.
3. Review public post typography and related-links density in a live browser pass.
4. Remove stale competing hero CSS once the current layout is accepted.
5. Convert current hero PNG assets to a lighter production format if hero performance becomes a priority.