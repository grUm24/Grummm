# CI/CD Pipeline (Phase 9.1)

## Scope

- Build backend (`platform/backend/src/WebAPI/WebAPI.csproj`)
- Build frontend (`@platform/frontend`)
- Build and push images (nginx, backend, postgres) to GHCR
- Deploy by branch:
  - `develop` -> `staging`
  - `main` -> `production`

## Current release assumptions

- Frontend production build is `vite build && node scripts/prerender-seo.mjs`.
- Frontend prerender prefers live public API data when `PRERENDER_SEO_API_URL` is set.
  - Fallback source remains `src/public/data/projects.ts` for offline/local builds.
- Frontend build mirrors `platform/frontend/dist` into `platform/infra/nginx/static` so nginx image builds use the same prerendered output.
- Backend Docker publish runs with runtime templates disabled by default:
  - `/p:EnableRuntimeTemplates=false`
- Public static demos are exposed by short routes:
  - `/{project-slug}/viewer/`
- Public web includes top-level mobile swipe navigation between:
  - `/`
  - `/projects`
  - `/posts`

## Workflow

- File: `.github/workflows/pipeline.yml`
- Triggers:
  - `push` to `develop`/`main`
  - `pull_request` to `develop`/`main` (CI build only)
  - `workflow_dispatch`

## Environment separation

- GitHub Environments:
  - `staging`
  - `production`
- Deploy path variables (optional, default `/opt/platform`):
  - `STAGING_DEPLOY_PATH`
  - `PRODUCTION_DEPLOY_PATH`
- Image tags:
  - immutable: short commit SHA
  - mutable env tag: `staging` or `production`

## Required secrets

- Registry:
  - `GHCR_USERNAME`
  - `GHCR_TOKEN`
- Staging SSH:
  - `STAGING_SSH_HOST`
  - `STAGING_SSH_USER`
  - `STAGING_SSH_KEY`
- Production SSH:
  - `PRODUCTION_SSH_HOST`
  - `PRODUCTION_SSH_USER`
  - `PRODUCTION_SSH_KEY`

## Deploy compose mode

- Base file: `docker-compose.yml`
- Deploy override: `docker-compose.deploy.yml`
- Required runtime env vars on remote deployment step:
  - `NGINX_IMAGE`
  - `BACKEND_IMAGE`
  - `POSTGRES_IMAGE`

The workflow exports these variables before `docker compose pull` and `docker compose up -d`.

## Post-deploy smoke

- Build verification:
  - `npm run build --workspace @platform/frontend`
    - optional live SEO source: `PRERENDER_SEO_API_URL=https://grummm.ru/api/public/projects npm run build --workspace @platform/frontend`
  - `dotnet build platform/backend/src/WebAPI/WebAPI.csproj --configuration Release`
- Public routes:
  - `/`
  - `/projects`
  - `/posts`
  - `/404`
- Demo routes:
  - open a published static demo by `/{project-slug}/viewer/`
  - confirm assets/styles load correctly inside viewer
- Public content:
  - confirm hero renders without CTA buttons
  - confirm `About` block layout/content renders correctly
  - if a post contains a `video` block, confirm it renders and scroll behavior remains stable
  - if a post was created via admin, confirm it appears in `/sitemap.xml` and its prerendered `/posts/{slug}` HTML contains article metadata after frontend rebuild
- Mobile-only navigation:
  - on a coarse-pointer device, swipe left/right between `/`, `/projects`, `/posts`
  - verify vertical scroll is not hijacked
- Security checks:
  - login/reauth UI must not display debug email codes
  - public demo viewer must stay sandboxed
