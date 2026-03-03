# Grummm Platform Monorepo

## What This Project Is

Grummm is a modular monolith platform with:
- public portfolio pages (`/`, `/projects`, `/projects/:id`),
- private admin workspace (`/app/*`),
- secure split between public and private APIs.

Tech stack:
- Backend: ASP.NET Core 9 (.NET 9)
- Frontend: React + TypeScript + Vite
- Infra: Nginx + Docker Compose + PostgreSQL baseline

## Current Capabilities

- Public landing with animated 2D Earth and portfolio cards
- Public projects catalog + project detail page
- Admin UI shell with private routes
- Admin projects workspace (`/app/projects`) to create/edit/delete posts and upload media
- TaskTracker private pages (`/app/tasks/*`)
- Backend `ProjectPosts` module with public read + admin CRUD endpoints
- `ProjectPosts` persistence via PostgreSQL repository (with in-memory fallback if DB is not configured)
- Project template metadata in posts: `TemplateType`, `FrontendPath`, `BackendPath`
- JWT auth baseline, AdminOnly policy, CSRF/correlation/audit/rate-limit baselines

## Repository Layout

- `platform/backend` - backend modules and WebAPI
- `platform/frontend` - frontend app (public + admin)
- `platform/infra` - nginx, server scripts, postgres image
- `docs` - runbooks, onboarding, deployment notes

## Important Context Files

- `ai-context.md` - current architecture and state snapshot
- `dev-state.md` - active tasks and immediate priorities
- `architecture-lock.md` - locked constraints and non-negotiable rules
- `docs/LLM_PROJECT_MAP.md` - navigable map for contributors/LLMs

## Run Frontend Build

```bash
npm run build --workspace @platform/frontend
```
