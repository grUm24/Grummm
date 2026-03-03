# Nginx Baseline (Phase 2.3)

## Implemented

- HTTPS enabled on `443` (self-signed fallback by default)
- HTTP (`80`) redirect to HTTPS
- HSTS enabled
- Security headers enabled (CSP, frame/options, sniffing, referrer, permissions, cross-origin)
- Rate limiting enabled (`10r/s`, burst `30`)
- Auth brute-force limiter enabled for `POST /api/public/auth/login` (`5r/m`)
- `proxy_pass` for `/api/*` to backend (`http://backend:8080`)
- Static frontend serving from `/usr/share/nginx/html` with SPA fallback
- Dynamic module assets serving from shared storage: `/app/{slug}/...` -> `/var/projects/{slug}/frontend`
- Correlation ID propagation enabled (`X-Correlation-ID`) with fallback to `$request_id`

## TLS Modes

- Default mode: self-signed certificate is generated on first container start.
- Let's Encrypt-ready path: `/.well-known/acme-challenge/` served from `/var/www/certbot`.

## Files

- `platform/infra/nginx/default.conf`
- `platform/infra/nginx/docker-entrypoint.sh`
- `platform/infra/nginx/static/index.html`

## Observability Baseline (Phase 7.5)

- `nginx` forwards `X-Correlation-ID` to backend.
- Response includes `X-Correlation-ID`.
- Access log includes `corr_id`.

## CSP Baseline (Phase 7.1)

- `default-src 'self'`
- `script-src 'self'`
- `style-src 'self'`
- `object-src 'none'`
- `frame-ancestors 'self'`
