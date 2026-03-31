# Environment Notes

## Current Development Environment

- **OS**: Windows 11 Pro
- **Shell**: Bash (via Git Bash / Claude Code) or PowerShell
- **Location**: `C:\Users\grUm.IGOR\Documents\Grummm`
- **Project Name**: Grummm Platform

## Available Tools

| Tool | Status | Notes |
|------|--------|-------|
| Node.js | Available | `npm` for workspace scripts |
| npm | Available | Package manager |
| Docker Desktop | Available | Required for full stack |
| dotnet SDK | Not on host | Builds run inside Docker or CI |
| gh (GitHub CLI) | Not installed | Use browser for PRs |

## Docker Dev Environment

Start the full dev stack:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Service | Port | Notes |
|---------|------|-------|
| Frontend (Vite) | 5173 | HMR enabled, proxies API to backend |
| Backend | 8080 | Standard Dockerfile (no hot reload) |
| PostgreSQL | 5432 | Database: `platform_dev` |

Dev credentials: `admin` / `admin123` (email verification disabled).

Backend changes require `--build` flag (dotnet watch crashes on Windows Docker volumes).

## Common Commands

```bash
# Frontend
npm run dev --workspace @platform/frontend
npm run build --workspace @platform/frontend
npm run typecheck --workspace @platform/frontend
npm run test --workspace @platform/frontend

# Docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Git
git checkout -b feature/my-feature
git push -u origin feature/my-feature
# Then create PR via GitHub web UI
```

## Project Structure Quick Reference

```text
Grummm/
|- .github/workflows/       CI/CD pipeline
|- platform/
|  |- backend/              ASP.NET Core 9 backend
|  |  `- src/
|  |     |- WebAPI/         Entry point, middleware, endpoints
|  |     |- Core/           Domain abstractions
|  |     |- Infrastructure/ Auth, JWT, refresh tokens, audit
|  |     `- Modules/        Business modules (ProjectPosts, Analytics, etc.)
|  |- frontend/             React + Vite frontend
|  |  `- src/
|  |     |- core/           Auth, layouts, routing, admin pages
|  |     |- public/         Public pages, store, types
|  |     |- shared/         i18n, SEO, motion
|  |     `- modules/        Auto-discovered plugins
|  `- infra/                Docker, nginx, server scripts
|- docs/                    Documentation and runbooks
|- scripts/                 Dev utilities
|- docker-compose.yml       Base compose (no secrets)
|- docker-compose.deploy.yml Production overlay
|- docker-compose.dev.yml   Development overlay
`- ai-context.md            Current state snapshot
```

## Route Zones (Locked)

| Zone | Routes | Access |
|------|--------|--------|
| Public Web | `/`, `/projects`, `/projects/:id`, `/posts`, `/posts/:id` | Anyone |
| Private Web | `/app/*` | Admin only |
| Public API | `/api/public/*` | Anyone |
| Private API | `/api/app/*` | Admin only (JWT) |

## Last Updated

2026-03-30
