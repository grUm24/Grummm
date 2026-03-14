# AI CONTEXT - PLATFORM STATE

Last Updated: 2026-03-15
Version: 7.2
Phase: 11.x (Operations and monitoring hardening, frontend shell reset)

> Important: the repository is the Grummm Platform. Some older docs/history may still reference previous naming or outdated frontend structure.

---

## 1. System Overview

Architecture: Modular Monolith
Backend: ASP.NET Core 9 / .NET 9
Frontend: React + TypeScript + Vite 5
Database: PostgreSQL
Proxy: Nginx
Deployment: Docker Compose

Project domain:
- Public portfolio platform (`/`, `/projects`, `/projects/:id`)
- Private admin workspace (`/app/*`) for secure management tasks
- Dynamic template runtime host for interactive project posts

## 2. Locked Route Zones

Public web:
- `/`
- `/projects`
- `/projects/:id`

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
- Landing page, projects listing and project detail pages
- Theme + language switching in public zone
- Persistent public shell through `PublicLayout`
- CSS/DOM planet visual in hero
- Editorial project detail summary where text is prioritized over the cover image
- Responsive project interaction model:
  - desktop: hover/tap friendly cards
  - mobile: touch-safe navigation and swipe-back helper on public pages

### 3.2 Private Admin Frontend

Implemented:
- Persistent admin shell through `PrivateAppLayout`
- Admin overview, projects workspace, posts mode, content page and security page
- Dynamic project viewer (`/app/:slug`)
- Session countdown, theme toggle, logout and mobile private navigation state

### 3.3 Frontend Reset Status

Important current frontend direction:
- business logic, stores and API calls were preserved
- frontend visual composition was reset and rebuilt around persistent layout shells
- route-level remounts of headers/layouts were removed by moving to nested routes with `Outlet`
- GSAP is used as a thin enhancement layer for reveal/stagger/button motion
- theme/language remain centralized in `src/public/preferences.tsx`
- current frontend documentation lives in:
  - `platform/frontend/FRONTEND_ARCHITECTURE.md`
  - `platform/frontend/FRONTEND_STRUCTURE.md`

### 3.4 Projects Data Flow

Current flow (hybrid):
- Frontend store in `project-store.ts`
- Tries backend API first (`/api/public/projects`, `/api/app/projects`)
- Falls back to `localStorage` when API/token is unavailable

Template flow:
- Upload endpoint: `POST /api/app/projects/{id}/upload-with-template`
- Nginx serves uploaded frontend from `/var/projects/{slug}/frontend` under `/app/{slug}/...`
- Embedded backend dispatch: `/api/app/{slug}/*`

### 3.5 Backend Modules

Implemented:
- `TaskTracker` module
- `ProjectPosts` module
- `Analytics` module
- `PlatformOps` module

### 3.6 Test and Smoke Status

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

1. Finish visual hardening of the rebuilt frontend shells after live browser review.
2. Keep frontend docs synchronized with current layout/store contracts.
3. Continue monitoring baseline rollout for upload/runtime errors.
4. Add alerting for `/api/app/projects/*` failures and runtime dispatch errors.
5. Add synthetic checks for `/app/{slug}/index.html` and `/api/app/{slug}/ping`.
