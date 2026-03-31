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
- `docker-compose.yml` now mounts `platform/infra/nginx/static` into nginx at runtime.
  - target servers do not need local Node/npm to boot the latest committed frontend snapshot.
- Frontend public build now includes a static server-side error document:
  - `platform/frontend/public/__error_404.html`
- Backend Docker publish runs with runtime templates disabled by default:
  - `/p:EnableRuntimeTemplates=false`
- Backend runtime includes `postgresql-client` so admin-only DB backups can be generated from the running container.
- Public static demos are exposed by short routes:
  - `/{project-slug}/viewer/`
- Invalid public URLs are expected to resolve to plain HTTP `404` with the static error page instead of SPA fallback or `500`.
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

Docker Compose uses an overlay strategy:
- `docker-compose.yml` — base (shared structure, no secrets, no env-specific config)
- `docker-compose.deploy.yml` — production overlay (GHCR images, production env vars, secrets from `.env.backend.local`)
- `docker-compose.dev.yml` — development overlay (local build, Vite HMR, dev database)

Production deploy command:
```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d
```

Dev environment command:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Required runtime env vars on remote deployment step:
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
- Invalid URL handling:
  - request a non-existent path such as `/does-not-exist`
  - confirm HTTP status is `404`
  - confirm nginx serves the static `__error_404.html` page instead of booting the SPA or returning `500`
- Public detail routes:
  - open a valid `/posts/{slug}` and `/projects/{slug}`
  - request non-existent `/posts/{missing}` and `/projects/{missing}`
  - confirm missing detail routes return HTTP `404`
- Demo routes:
  - open a published static demo by `/{project-slug}/viewer/`
  - confirm assets/styles load correctly inside viewer
- Admin ops:
  - open `/app`
  - confirm the readiness card shows latest DB backup state
  - click `Create backup`
  - confirm a `platform_*.sql.gz` file downloads and a matching artifact appears in `backups/postgres`
- Public content:
  - confirm hero renders without CTA buttons
  - confirm `About` block layout/content renders correctly
  - confirm public footer is present on all public pages and mobile footer actions stay centered
  - if a post contains a `video` block, confirm it autoplays once when the block enters the viewport and does not pin/scrub with scroll
  - if a post video block has no poster URL, confirm the block still saves and renders correctly
  - if a post was created via admin, confirm it appears in `/sitemap.xml` and its prerendered `/posts/{slug}` HTML contains article metadata after frontend rebuild
- Mobile-only navigation:
  - on a coarse-pointer device, swipe left/right between `/`, `/projects`, `/posts`
  - verify vertical scroll is not hijacked
- Security checks:
  - login/reauth UI must not display debug email codes
  - public demo viewer must load without asset/CORS errors
  - invalid public routes must not surface `500`

## Fast bootstrap on a new IP

When repo files and `.env.backend.local` are already present on the target host, use:

```bash
chmod +x platform/infra/server/bootstrap-platform-stack.sh
ROOT_DIR=/opt/platform READY_URL=https://grummm.ru/ready ./platform/infra/server/bootstrap-platform-stack.sh
```

The script:

- ensures `backups/postgres` exists
- builds/recreates the full compose stack
- waits for `/ready` to become green
