# Frontend Structure

Root: `platform/frontend`

Companion docs:
- `FRONTEND_ARCHITECTURE.md` - routing, layouts, stores, motion layer and UI ownership
- `../docs/LLM_PROJECT_MAP.md` - cross-project map for backend/frontend/infra
- `../ai-context.md` - current platform state snapshot

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
   |- images/
   |  |- logo_dark.png
   |  `- logo_white.png
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

## Ownership map

### `src/main.tsx`
Bootstraps React, restores the auth session and mounts `AppRouter`.

### `src/styles.css`
Global frontend design system and responsive behavior. It owns theme tokens, shell geometry, cards, forms, hero layout and cross-page spacing.

### `src/images`
Theme-aware hero artwork used by the landing hero.

### `src/core`
Application shell layer:
- auth session
- route guards
- public/private layouts
- router tree
- private admin pages
- plugin registry

### `src/public`
Public showcase layer:
- landing page
- project list/detail pages
- public UI components
- preferences
- landing and project stores

### `src/modules`
Frontend plugin modules. These are discovered through the registry and should not be hard-wired into the router.

### `src/shared/i18n`
Local translation dictionaries and helper utilities.

### `src/shared/ui`
Cross-cutting motion enhancement hooks. Current GSAP behavior is centralized here.

## Current public composition

- `PublicHeader.tsx` - persistent public navigation and integrated theme/language controls
- `LandingHeroSection.tsx` - layered text-first hero with right-side decorative scene
- `PortfolioSection.tsx` - reusable wrapper for curated posts and modules
- `ProjectCard.tsx` - unified project card with expand-then-navigate interaction model
- `ProjectDetailHeader.tsx` - title/description + full-width back button, no tags
- `ProjectDetailSummary.tsx` - editorial text-first detail summary

## Current frontend direction

The frontend is intentionally organized around:
- persistent shells
- composable sections
- centralized stores
- centralized theme and language
- a thin GSAP enhancement layer
- a CSS-owned visual system in one file

If the visual layer changes again, these boundaries should remain intact.
