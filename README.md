# Trash Platform Monorepo

## Structure

- `platform/backend` - ASP.NET Core backend (modular monolith)
- `platform/frontend` - React + TypeScript frontend
- `platform/infra` - Infrastructure configs (Docker, Nginx, deployment assets)

## Status

Core platform baseline is implemented and documented.
Current public UX baseline includes:
- landing `/` with animated 2D Earth and orbiting tech labels (no Three.js dependency),
- project portfolio grid `/projects`,
- project detail route `/projects/:id`,
- theme/language switching and responsive behavior.

For architecture and operations details, see:
- `docs/LLM_PROJECT_MAP.md`
- `docs/landing-portfolio-roadmap.md`
- `docs/README.md`
