# Frontend Structure

Root: `platform/frontend`

Main companion doc:
- `FRONTEND_ARCHITECTURE.md` - explains routing, layouts, stores, motion layer and where to change UI safely.

## Tree

```text
platform/frontend/
|- FRONTEND_ARCHITECTURE.md
|- FRONTEND_STRUCTURE.md
|- index.html
|- jest.config.cjs
|- package.json
|- tsconfig.json
|- vite.config.ts
`- src/
   |- main.tsx
   |- styles.css
   |- core/
   |  |- README.md
   |  |- auth/
   |  |  |- auth-api.ts
   |  |  `- auth-session.tsx
   |  |- layouts/
   |  |  |- index.ts
   |  |  |- PrivateAppLayout.tsx
   |  |  `- PublicLayout.tsx
   |  |- pages/
   |  |  |- AdminLandingContentPage.tsx
   |  |  |- AdminLoginPage.tsx
   |  |  |- AdminOverviewPage.tsx
   |  |  |- AdminProjectsWorkspace.test.tsx
   |  |  |- AdminProjectsWorkspace.tsx
   |  |  |- AdminSecurityPage.tsx
   |  |  `- DynamicProjectViewer.tsx
   |  |- plugin-registry/
   |  |  |- index.ts
   |  |  |- module-contract.ts
   |  |  `- registry.ts
   |  `- routing/
   |     |- AppRouter.dynamic-viewer.test.tsx
   |     |- AppRouter.tsx
   |     |- index.ts
   |     `- ProtectedRoute.tsx
   |- modules/
   |  |- README.md
   |  `- task-tracker/
   |     |- task-tracker.module.tsx
   |     |- TaskTrackerBoardPage.tsx
   |     |- TaskTrackerCreatePage.tsx
   |     |- TaskTrackerPrivatePage.tsx
   |     `- TaskTrackerPublicPage.tsx
   |- public/
   |  |- preferences.tsx
   |  |- types.ts
   |  |- assets/
   |  |  |- alien_planet.glb
   |  |  `- logo.png
   |  |- components/
   |  |  |- HeroActions.tsx
   |  |  |- HeroHighlights.tsx
   |  |  |- LandingAboutSection.tsx
   |  |  |- LandingHeroSection.tsx
   |  |  |- LiquidGlass.tsx
   |  |  |- ParagraphText.tsx
   |  |  |- PortfolioSection.tsx
   |  |  |- PreferenceSegmentedControl.tsx
   |  |  |- ProjectCard.test.tsx
   |  |  |- ProjectCard.tsx
   |  |  |- ProjectCardGrid.tsx
   |  |  |- ProjectCardPlaceholder.tsx
   |  |  |- ProjectDetailHeader.tsx
   |  |  |- ProjectDetailSummary.tsx
   |  |  |- ProjectLightbox.tsx
   |  |  |- ProjectNotFoundCard.tsx
   |  |  |- ProjectPopup.tsx
   |  |  |- ProjectPreviewCard.tsx
   |  |  |- ProjectsCatalogHeader.tsx
   |  |  |- ProjectScreensGallery.tsx
   |  |  |- PublicHeader.tsx
   |  |  |- RotatingEarth.tsx
   |  |  `- SectionHeading.tsx
   |  |- data/
   |  |  |- landing-content-store.ts
   |  |  |- project-store.ts
   |  |  `- projects.ts
   |  |- hooks/
   |  |  `- useSwipeBack.ts
   |  `- pages/
   |     |- LandingPage.tsx
   |     |- ProjectDetailPage.tsx
   |     `- ProjectsPage.tsx
   |- shared/
   |  |- i18n/
   |  |  |- en.ts
   |  |  |- get-current-language.ts
   |  |  |- index.ts
   |  |  |- ru.ts
   |  |  `- t.ts
   |  `- ui/
   |     `- useGsapEnhancements.ts
   `- test/
      `- setupTests.ts
```

## What Lives Where

### `src/main.tsx`
- Bootstraps React.
- Restores auth session from `localStorage`.
- Passes session to `AppRouter`.

### `src/core`
- Application shell and routing layer.
- Auth, layouts, route guards, admin pages, plugin registry.
- This is where frontend-wide behavior is defined.

### `src/public`
- Public showcase, public state and display components.
- `pages/` orchestrate public screens.
- `components/` render reusable public UI.
- `data/` owns stores and seed content.

### `src/modules`
- Plugin frontend modules.
- Registered through the registry, not manually wired into the router.

### `src/shared/i18n`
- Built-in translation layer.
- `ru.ts` and `en.ts` are the source of truth for UI copy.

### `src/shared/ui`
- Cross-cutting UI behavior.
- `useGsapEnhancements.ts` applies reveal/stagger/button motion without owning layout or business logic.

### `src/styles.css`
- Global design system.
- Theme tokens, layout shells, surfaces, buttons, forms, cards, responsive rules.

## Route Ownership

### Public shell
- `src/core/layouts/PublicLayout.tsx`
- Persistent header + public content outlet.

### Private shell
- `src/core/layouts/PrivateAppLayout.tsx`
- Private topbar, sidebar, session info, logout/theme controls.

### Route tree
- `src/core/routing/AppRouter.tsx`
- Uses nested routes so headers/layouts stay mounted between page transitions.

### Route guard
- `src/core/routing/ProtectedRoute.tsx`
- Protects `/app/*` and can render `children` or an `Outlet`.

## Public Composition

- `PublicHeader.tsx` - public nav and preferences block.
- `LandingHeroSection.tsx` - main hero split layout.
- `LandingAboutSection.tsx` - about block.
- `PortfolioSection.tsx` - reusable editorial section wrapper.
- `ProjectCardGrid.tsx` + `ProjectCard.tsx` - project catalog.
- `ProjectsCatalogHeader.tsx` - `/projects` heading surface.
- `ProjectDetailHeader.tsx` + `ProjectDetailSummary.tsx` - detail intro and editorial summary.
- `ProjectScreensGallery.tsx` + `ProjectLightbox.tsx` - screenshots and modal viewing.

## State and Data

### `preferences.tsx`
- Stores theme and language.
- Syncs `data-theme` and `lang` on `<html>`.
- Persists values in `localStorage`.

### `project-store.ts`
- Public read via `/api/public/projects`.
- Admin mutations via `/api/app/projects`.
- Controlled fallback to `localStorage`.

### `landing-content-store.ts`
- Landing copy/image content with the same API-first, fallback-capable approach.

## Fast Orientation

If you need to change:
- navigation or shell: `src/public/components/PublicHeader.tsx`, `src/core/layouts/*`, `src/styles.css`
- hero: `src/public/components/LandingHeroSection.tsx`, `src/public/components/RotatingEarth.tsx`, `src/styles.css`
- project cards: `src/public/components/ProjectCard.tsx`, `src/public/components/ProjectCardGrid.tsx`, `src/styles.css`
- project detail page: `src/public/components/ProjectDetail*`, `src/styles.css`
- admin shell: `src/core/layouts/PrivateAppLayout.tsx`, `src/core/pages/*`, `src/styles.css`
- theme/language: `src/public/preferences.tsx`, `src/shared/i18n/*`
- project data behavior: `src/public/data/project-store.ts`

## Current Frontend Direction

The current frontend is intentionally split into:
- persistent shells
- composable page sections
- centralized stores
- centralized theme/i18n
- a thin GSAP enhancement layer

That split is now more important than any specific visual styling. If the visual layer is redesigned again, these boundaries should stay intact.
