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
   |  |- components/
   |  |  `- AdminPostBlocksEditor.tsx
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
   |  |  |- HeroMorphTitle.tsx
   |  |  |- LandingAboutSection.tsx
   |  |  |- LandingHeroSection.tsx
   |  |  |- LiquidGlass.tsx
   |  |  |- ParagraphText.tsx
   |  |  |- PortfolioSection.tsx
   |  |  |- PostContentRenderer.tsx
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
   |  |  |- RelatedEntriesSection.tsx
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
   |     |- PostsPage.tsx
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
Global frontend design system and responsive behavior. It owns theme tokens, shell geometry, cards, forms, hero layout, post detail layout, admin post block editor layout, and cross-page spacing.

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
- admin-only post block editor component

### `src/public`
Public showcase layer:
- landing page
- separate projects catalog and posts catalog
- split detail flow for posts vs projects
- public UI components
- preferences
- landing and project stores

### `src/public/types.ts`
Defines the frontend portfolio contract, including:
- `PortfolioEntryKind`
- `PortfolioContentBlockType`
- `PortfolioContentBlock`
- `PortfolioProject`

### `src/core/pages/AdminProjectsWorkspace.tsx`
Owns creation/editing workflows for:
- runtime projects
- editorial posts
- custom template picker UI
- block-based post authoring

### `src/public/data/project-store.ts`
Owns API-first project/post CRUD and normalization for:
- `kind`
- `contentBlocks`
- template-path defaults
- localStorage fallback
- normalization of backend block-type casing so post images survive API reloads

### `src/core/components/AdminPostBlocksEditor.tsx`
Dedicated editor used only for posts mode in admin. It owns add/reorder/remove logic for paragraph/subheading/image blocks.

### `src/public/components/PostContentRenderer.tsx`
Renders structured public post bodies from `contentBlocks`.

### `src/public/components/RelatedEntriesSection.tsx`
Renders bottom-of-post recommendations for other posts and projects.

## Current public composition

- `PublicHeader.tsx` - persistent public navigation and integrated theme/language controls
- `LandingHeroSection.tsx` - text-first layered hero with a desktop-only decorative scene
- `HeroMorphTitle.tsx` - desktop-only morph title that keeps `Grummm` static and morphs the suffix phrase
- `PortfolioSection.tsx` - reusable wrapper for curated posts and modules
- `ProjectCard.tsx` - unified card with expand-then-navigate interaction model and tags shown only at card level
- `ProjectDetailHeader.tsx` - title/description + full-width back button, no tags
- `ProjectDetailSummary.tsx` - project-only editorial summary
- `PostContentRenderer.tsx` - post-only structured article body
- `RelatedEntriesSection.tsx` - post-only recommendations footer

## Current frontend direction

The frontend is intentionally organized around:
- persistent shells
- composable sections
- centralized stores
- centralized theme and language
- a thin GSAP enhancement layer
- explicit split between showcase posts and runtime projects
- block-based editorial post content

If the visual layer changes again, these boundaries should remain intact.