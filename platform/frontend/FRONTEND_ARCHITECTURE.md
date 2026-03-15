# Frontend Architecture Guide

This document describes the current frontend architecture after the visual reset and subsequent hero/card/header iterations.

## Stable boundaries

The following contracts are fixed and must be preserved:
- Public routes: `/`, `/projects`, `/projects/:id`
- Private routes: `/app/*`
- Frontend module discovery through the plugin registry
- Centralized theme and language preferences
- API-first stores with controlled local fallback
- Auth guard through `ProtectedRoute`
- Persistent shells through `PublicLayout` and `PrivateAppLayout`

Business logic, store contracts, API usage and route ownership stay stable. Visual composition and DOM structure may change.

## Entry point

File: `src/main.tsx`

Startup flow:
1. Resolve `#root`
2. Restore auth session from `localStorage`
3. Pass the restored session into `AppRouter`
4. Mount the app with global styles from `src/styles.css`

The app boots from restored client state first and then resolves routes.

## Provider and router tree

Primary file: `src/core/routing/AppRouter.tsx`

Current tree:
1. `AuthSessionProvider`
2. `PreferencesProvider`
3. `BrowserRouter`
4. Public analytics tracker
5. Nested route tree
6. Reauth dialog overlay

Important consequence:
- Public and private shells stay mounted between route transitions
- Page content changes through nested routes and `Outlet`
- Layout remount flicker is intentionally avoided

## Routing model

### Public zone
Rendered inside `PublicLayout`:
- `/`
- `/login`
- `/projects`
- `/projects/:id`
- public routes from frontend modules

### Private zone
Rendered inside `ProtectedRoute` + `PrivateAppLayout`:
- `/app`
- `/app/projects`
- `/app/posts`
- `/app/content`
- `/app/security`
- `/app/:slug`
- private routes from frontend modules

## Layout shells

### `PublicLayout`
Responsibilities:
- Persistent public header
- Shared shell width and spacing
- Public content outlet
- GSAP enhancement hookup for public screens

### `PrivateAppLayout`
Responsibilities:
- Private top bar and aside navigation
- Session state and logout
- Theme control in admin zone
- Mobile private navigation state
- Shared outlet for `/app/*`

## Preferences and i18n

### Preferences
File: `src/public/preferences.tsx`

Stores:
- `theme`
- `language`

Sync targets:
- `localStorage`
- `document.documentElement.dataset.theme`
- `document.documentElement.lang`

### Translation layer
Files:
- `src/shared/i18n/ru.ts`
- `src/shared/i18n/en.ts`
- `src/shared/i18n/t.ts`
- `src/shared/i18n/get-current-language.ts`

Principle:
- translations are local dictionaries in the repo
- no external i18n library is used
- UI must consume the centralized `t(...)` layer

## Frontend plugin model

Files:
- `src/core/plugin-registry/module-contract.ts`
- `src/core/plugin-registry/registry.ts`
- `src/modules/*/*.module.tsx`

Rules:
- modules declare their own public and private pages
- registry discovers modules automatically
- core router must not manually wire module pages

## Data layer

### `project-store.ts`
Responsibilities:
- public projects fetch
- admin CRUD
- upload/template related project flows
- fallback to `localStorage`

### `landing-content-store.ts`
Responsibilities:
- landing hero copy
- about block copy
- portfolio intro copy
- about photo

Common rule:
- stores are API-first
- local fallback is controlled and only used when API/token is unavailable

## Public UI composition

### `PublicHeader.tsx`
Contains:
- brand block
- primary nav with GSAP-driven active indicator
- integrated preferences panel for theme/language
- responsive mobile/desktop behavior in one component

Important:
- the header lives in `PublicLayout`
- it must stay mounted across public route changes
- route changes may reposition the active indicator, but should not remount the shell

### `LandingHeroSection.tsx`
Current model:
- layered hero, not a symmetric grid split
- decorative scene is rendered as a right-side absolute layer
- text content is a foreground layer
- theme-aware cube artwork is supplied through CSS background assets from `src/images`
- CTA actions live below the lead text

Current principle:
- the hero is text-first
- the scene is decorative support, not the dominant layout container
- overlap between title and scene is controlled through CSS, not through business logic

### `PortfolioSection.tsx`
Reusable wrapper for curated posts and runtime-ready modules on the landing page.

### `ProjectCard.tsx`
Current card behavior:
- unified media/text shell
- single interaction model for desktop and touch
- first tap/click expands context, next tap navigates
- tags are shown only on cards
- bottom tag row is rendered as a slow marquee
- long text is clamped with ellipsis
- a small hint explains the interaction model

### `ProjectDetailHeader.tsx`
Current detail intro:
- no tags in the post header
- title and description only
- full-width back button below the heading block

### `ProjectDetailSummary.tsx`
Current principle:
- editorial reading surface
- text dominates the composition
- cover image is secondary and narrower than the text column

## Private/admin UI composition

Core files:
- `src/core/layouts/PrivateAppLayout.tsx`
- `src/core/pages/AdminOverviewPage.tsx`
- `src/core/pages/AdminProjectsWorkspace.tsx`
- `src/core/pages/AdminLandingContentPage.tsx`
- `src/core/pages/AdminSecurityPage.tsx`
- `src/core/pages/DynamicProjectViewer.tsx`

Rule:
- private pages consume the shell
- shell behavior must not be reimplemented inside page components

## Motion layer

File: `src/shared/ui/useGsapEnhancements.ts`

Current contract:
- `[data-gsap='reveal']` for container reveal
- `[data-gsap='stagger']` for child stagger
- `[data-gsap-button]` for hover/press interaction
- respects `prefers-reduced-motion`

Rule:
- GSAP enhances motion only
- it must not own layout, route state or business behavior

## CSS architecture

File: `src/styles.css`

This is the single design-system layer for the SPA.

It currently contains:
- theme tokens
- base typography and spacing
- public/private shells
- buttons, chips, cards, forms
- landing hero layout
- project detail layout
- responsive overrides

Current caution:
- `hero` has gone through multiple iterations and now relies on a final layered override at the end of the file
- if the hero is refactored again, the old competing rules should be removed instead of stacking more overrides

## Asset ownership

Current frontend image assets relevant to hero:
- `src/images/logo_white.png`
- `src/images/logo_dark.png`

Used for:
- theme-aware hero artwork

Current limitation:
- both assets are still relatively heavy and should be converted to a lighter production format if hero performance becomes a priority

## Where to change what

Change navigation or shell:
- `src/public/components/PublicHeader.tsx`
- `src/public/components/PreferenceSegmentedControl.tsx`
- `src/core/layouts/PublicLayout.tsx`
- `src/styles.css`

Change hero:
- `src/public/components/LandingHeroSection.tsx`
- `src/public/components/HeroActions.tsx`
- `src/styles.css`
- `src/images/logo_white.png`
- `src/images/logo_dark.png`

Change landing sections and cards:
- `src/public/components/PortfolioSection.tsx`
- `src/public/components/ProjectCard.tsx`
- `src/public/components/ProjectCardGrid.tsx`
- `src/styles.css`

Change detail page:
- `src/public/components/ProjectDetailHeader.tsx`
- `src/public/components/ProjectDetailSummary.tsx`
- `src/public/components/ProjectScreensGallery.tsx`
- `src/public/components/ProjectLightbox.tsx`
- `src/styles.css`

Change theme/language behavior:
- `src/public/preferences.tsx`
- `src/shared/i18n/*`

Change project/landing data behavior:
- `src/public/data/project-store.ts`
- `src/public/data/landing-content-store.ts`

## Current practical state

The frontend is currently organized around:
- persistent shells
- composable public sections
- centralized stores
- centralized theme/language
- thin GSAP enhancement hooks
- a text-first layered hero composition

That split is the key architectural boundary. Future visual redesigns should keep it intact.
