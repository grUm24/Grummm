# CLAUDE.md

Project context for Claude Code sessions.

## Quick orientation

This is **Grummm Platform** — a modular monolith for publishing projects and editorial posts.

Read these files for full context (in order):
1. `docs/LLM_SYSTEM_STATE.md` — system overview, architecture, all runtime flows
2. `docs/LLM_PROJECT_MAP.md` — verified file-level map
3. `ai-context.md` — rolling feature snapshot
4. `llm-rules.md` — hard constraints

## Tech stack

- Backend: ASP.NET Core 9 / .NET 9, raw Npgsql (ProjectPosts), PostgreSQL
- Frontend: React 18 + TypeScript + Vite 5
- Infra: Docker Compose (base + overlay), Nginx, GitHub Actions CI/CD
- Auth: JWT (15 min) + refresh token rotation (7 days, PostgreSQL-persisted)

## Commands

```bash
# Dev environment (Docker)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Frontend
npm run dev --workspace @platform/frontend
npm run build --workspace @platform/frontend
npm run typecheck --workspace @platform/frontend
npm run test --workspace @platform/frontend

# Backend (inside Docker or CI only — dotnet not on host)
dotnet build platform/backend/src/WebAPI/WebAPI.csproj --configuration Release
dotnet test platform/backend/tests/ProjectPosts.Tests/ProjectPosts.Tests.csproj
```

## Constraints

- Route zones are locked: public (`/`, `/projects`, `/posts`), private (`/app/*`), public API (`/api/public/*`), private API (`/api/app/*`)
- Module isolation: no cross-module business imports
- ProjectPosts uses raw Npgsql, not EF Core
- Docker Compose overlay strategy: no secrets in base file
- Refresh tokens must stay PostgreSQL-persisted
- nginx conf must be UTF-8 without BOM
- Git: branch protection on main, PRs with review required

## Environment

- OS: Windows 11
- Shell: Bash (Git Bash / Claude Code)
- dotnet SDK not installed on host (builds in Docker/CI)
- gh CLI not installed (create PRs via browser)
- Dev admin creds: `admin` / `admin123` (email verification disabled)
