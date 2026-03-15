# AI CONTEXT - PLATFORM STATE

Last Updated: 2026-03-15
Version: 7.4
Phase: 11.x (operations hardening, frontend visual reset in progress)

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
- Landing hero rebuilt as a layered composition:
  - desktop uses a right-side decorative cube scene from `src/images`
  - mobile hides the scene completely and keeps the hero text-first
  - content order is `eyebrow -> title -> description -> CTA actions`
- Hero title uses `HeroMorphTitle.tsx`:
  - `Grummm` stays static
  - only the suffix phrase morphs on desktop
  - morphing is disabled on mobile and for `prefers-reduced-motion`
- Editorial project detail summary where text is prioritized over the cover image
- Responsive project interaction model:
  - cards expand first, then navigate on the next click/tap
  - tags are shown on cards, not inside post headers
  - mobile public pages support swipe-back helper behavior

### 3.2 Private Admin Frontend

Implemented:
- Persistent admin shell through `PrivateAppLayout`
- Admin overview, projects workspace, posts mode, content page and security page
- Dynamic project viewer (`/app/:slug`)
- Session countdown, theme toggle, logout and responsive private navigation state

### 3.3 Frontend Reset Status

Important current frontend direction:
- business logic, stores and API calls are preserved
- frontend composition has been reset and is being rebuilt around persistent layout shells
- route-level layout remounts were removed through nested routes with `Outlet`
- GSAP is used as a thin enhancement layer for reveal/stagger/button motion
- desktop surfaces now also use a pointer-follow glow effect in the platform palette
- theme/language remain centralized in `src/public/preferences.tsx`
- current frontend documentation lives in:
  - `platform/frontend/FRONTEND_ARCHITECTURE.md`
  - `platform/frontend/FRONTEND_STRUCTURE.md`

Current caution:
- `src/styles.css` still contains layers from multiple hero iterations; the latest hero layout is defined by the final override block at the end of the file
- `detail-summary` is intentionally excluded from the desktop glow effect because it reduced readability on long-form content

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

1. Finish visual cleanup of the rebuilt frontend after live browser review.
2. Remove stale competing hero CSS once the current layout is accepted.
3. Keep frontend docs synchronized with current layout/store contracts.
4. Continue monitoring baseline rollout for upload/runtime errors.
5. Convert current hero PNG assets to a lighter production format if hero performance becomes a priority.
