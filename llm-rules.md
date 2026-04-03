# LLM Rules (Hard Constraints)

1. Do not break route-zone boundaries:
   - public web: `/`, `/projects`, `/projects/:id`, `/posts`, `/posts/:id`
   - private web: `/app/*`
   - public API: `/api/public/*`
   - private API: `/api/app/*`
2. Keep module isolation strict:
   - no cross-module business imports,
   - shared contracts only through `core`/contract boundaries.
3. Do not move business logic into controllers or layout wrappers.
4. Keep DTO boundaries explicit; never expose persistence/domain entities directly from API contracts.
5. Preserve security baseline:
   - CSRF/XSS/IDOR/mass-assignment protections must stay active,
   - audit logging and correlation-id middleware must not be bypassed.
6. Frontend public and private shells are separate:
   - public pages render in `PublicLayout`,
   - private pages render in `PrivateAppLayout` with auth guard.
7. Preserve plugin auto-registration:
   - frontend modules via `*.module.ts(x)` + `import.meta.glob`,
   - backend modules via existing discovery flow.
8. Any UX change that affects deploy checks must be reflected in docs smoke steps.
9. Prefer additive changes over refactors of stable architecture.
10. Before finalizing, run at least build + relevant tests for changed scope.
11. Refresh tokens must be PostgreSQL-persisted; do not revert to memory-only storage.
12. ProjectPosts module uses raw Npgsql (not EF Core); keep this pattern for new tables in that module.
13. Docker Compose uses overlay strategy (base + env-specific); do not merge secrets into the base file.
14. Topics and relations are bidirectional at query level (UNION); storage is directional (source_id → target_id).
