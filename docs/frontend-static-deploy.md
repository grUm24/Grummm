# Frontend Static Deploy

## Scope

Use this flow when only public/admin frontend code changed and backend/nginx config did not change.

## What is deployed

- local frontend build output
- prerendered HTML
- mirrored nginx static snapshot in:
  - `platform/infra/nginx/static`

`docker-compose.yml` serves nginx content from this folder directly.

## Local build

Run on the development machine:

```bash
npm run build --workspace @platform/frontend
```

What this does:

- builds Vite output into `platform/frontend/dist`
- runs `scripts/prerender-seo.mjs`
- mirrors the final result into `platform/infra/nginx/static`

## Files to upload

Upload this folder to the server:

```text
platform/infra/nginx/static
```

Target path on server:

```text
/opt/platform/platform/infra/nginx/static
```

## Server apply

After upload:

```bash
cd /opt/platform
docker compose up -d --force-recreate nginx
```

This is enough because nginx mounts `platform/infra/nginx/static` as a runtime volume.

## Verification

Check:

```bash
curl -I https://grummm.ru/
curl -I https://grummm.ru/posts
curl -I https://grummm.ru/projects
curl -I https://grummm.ru/404
```

Then open the site in browser and hard reload.

## Use this flow when

- styles/components/text changed
- public pages changed
- admin UI changed
- prerendered SEO output changed
- no backend/API contract changed
- no nginx config changed
