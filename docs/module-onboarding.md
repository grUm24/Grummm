# Module Onboarding Guide (Backend + Frontend)

Last Updated: 2026-02-25
Version: 1.0
Status: BASELINE

## 1. Goal

This guide defines the exact baseline flow for adding a new module to the platform without breaking locked architecture rules.

## 2. Naming Rules

- Module name in backend namespace: `PascalCase` (example: `FinanceTracker`).
- Frontend module id: `kebab-case` (example: `finance-tracker`).
- Backend API route segment SHOULD be module-oriented (example: `/api/public/finance-tracker/*`, `/api/app/finance-tracker/*`).
- Cross-module dependencies are prohibited.

## 3. Backend Onboarding Steps

1. Create module folder and project:
`platform/backend/src/Modules/{ModuleName}/`.
2. Add module project file:
`platform/backend/src/Modules/{ModuleName}/{ModuleName}.Module.csproj`.
3. Ensure module assembly name starts with `Platform.Modules.`.
This is required for backend auto-discovery.
4. Add module class implementing `IModule` from:
`platform/backend/src/Core/Contracts/Modules/IModule.cs`.
5. Implement `RegisterServices(IServiceCollection)`:
register only services owned by this module.
6. Implement `MapEndpoints(IEndpointRouteBuilder)`:
map routes only under `/api/public/*` and `/api/app/*`.
7. Apply authorization to private routes:
`/api/app/*` endpoints must require `AdminOnly`.
8. Add placeholder DTO/contracts for module endpoints.
Expose DTO only, never domain/entity types.
9. Optional persistence registration:
if module needs DB context, register via
`AddModuleDbContext<TContext>(moduleName, schema, connectionString)`.
10. Ensure `WebAPI.csproj` keeps wildcard project reference:
`..\Modules\**\*.csproj` (no per-module manual reference needed).
11. Ensure `Program.cs` keeps `AddPlatformModules()`
(no per-module manual registration needed).
12. Verify no direct references to other module assemblies.
13. Apply SQLi baseline:
avoid raw SQL concatenation; use EF parameterized/LINQ queries.
14. Apply IDOR baseline:
for private resource endpoints, enforce owner/admin access check.
15. Apply mass-assignment baseline:
map request DTO into explicit command model, do not bind server-owned fields from request body.
16. Keep token lifecycle baseline:
access token TTL and refresh TTL are configured via `Jwt` options;
refresh token must rotate and be returned via secure cookie only.
17. For admin write actions in private API zone, ensure audit logging coverage:
action must be recorded by audit middleware/table baseline.
18. Preserve correlation traceability:
do not remove/override `X-Correlation-ID` propagation in module endpoints.

## 4. Frontend Onboarding Steps

1. Create module folder:
`platform/frontend/src/modules/{module-name}/`.
2. Add module entry file with suffix `.module.ts` or `.module.tsx`.
3. Export default object `module` matching `FrontendModuleContract` from:
`platform/frontend/src/core/plugin-registry/module-contract.ts`.
No manual registry edits are required.
4. Set unique `id` in kebab-case.
5. Declare route ownership in metadata:
use `publicPage`, `privateApp`, `routes`, `permissions`.
6. Respect locked zones:
public routes must not start with `/app`,
private routes must start with `/app`.
7. Do not import other modules directly.
Use only `src/core` and `src/shared` cross-cutting dependencies.
8. Ensure private app routes are inside `/app*` so they are guarded by
`ProtectedRoute` and rendered in `PrivateAppLayout`.
9. Ensure public routes are rendered inside `PublicLayout`.
10. Run local contract checks by loading registry:
`moduleRegistry` from `platform/frontend/src/core/plugin-registry/registry.ts`.
11. If module introduces cookie-based state-changing requests,
use antiforgery flow (`GET /api/public/security/csrf` + `X-CSRF-TOKEN`).
12. For private module routes under `/app`, align frontend ownership UI with backend ownership checks.
13. Use access token from API response; refresh flow relies on cookie transport.

## 5. Definition of Done (Baseline)

1. Module compiles in solution/workspace.
2. Backend module implements `IModule` and maps only allowed API prefixes.
3. Frontend module exports valid metadata and is auto-discovered by `import.meta.glob`.
4. No cross-module dependency introduced.
5. Private routes are under `/app*` and therefore protected by `AdminOnly`.
6. Context files updated:
`dev-state.md`, `ai-context.md`, and if constraints changed `architecture-lock.md`.
7. Deploy smoke flow is passed:
`commit -> build -> docker restart -> verify /projects and /app`.

## 6. Minimal Skeleton Checklist

1. Backend: module project + `IModule` class + placeholder public/private endpoints.
2. Frontend: `.module.tsx` file with `id`, one placeholder route metadata entry.
3. No business logic beyond scaffold level.

## 7. Deploy Smoke Validation

Use:

- `docs/module-deploy-smoke.md`
- `platform/infra/server/deploy-module-smoke.sh`
- `docs/security-phase7-baseline.md`
- `docs/audit-logging.md`
- `docs/correlation-id.md`

## 8. Public Landing + Portfolio Notes

If onboarding changes public experience (`/`, `/projects`, `/projects/:id`), verify:

1. Landing hero renders without runtime errors (including R3F earth canvas).
2. Theme toggle updates colors/components and persists after reload.
3. Language toggle updates all public portfolio texts.
4. Project cards open preview on hover (desktop) and single tap (mobile).
5. Double tap on mobile opens project detail route.
6. `/projects/:id` detail page loads media lazily and back navigation works.
