# Frontend Architecture Guide

This document describes the current frontend architecture after the visual reset, layout persistence work, and the current landing hero rebuild.

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
- primary nav with a GSAP-positioned active indicator
- integrated preferences panel for theme/language
- responsive mobile/desktop behavior in one component

Important:
- the header lives in `PublicLayout`
- it stays mounted across public route changes
- route changes may reposition the active indicator, but should not remount the shell
- mobile public navigation is currently rendered as an always-open control block, not a hamburger drawer

### `LandingHeroSection.tsx`
Current model:
- layered hero, not a symmetric grid split
- desktop scene is a right-side decorative absolute layer
- mobile scene is intentionally hidden to keep the hero text-first
- content order is strict: eyebrow -> title -> description -> CTA actions
- theme-aware cube artwork is supplied through CSS background assets from `src/images`

Current principle:
- the hero is text-first
- the scene is decorative support, not the dominant layout container
- overlap between title and scene is controlled through CSS only
- the active layout contract is defined by the final hero overrides at the end of `src/styles.css`

### `HeroMorphTitle.tsx`
Current behavior:
- keeps `Grummm` static
- morphs only the suffix phrase on desktop
- disables morphing on mobile and with `prefers-reduced-motion`
- uses an SVG threshold filter and two text layers, inspired by a text-morph pattern

Current phrases:
- RU defaults: `оживляет проекты`, `запускает демо`, `собирает платформы`
- EN defaults: `brings projects to life`, `launches live demos`, `powers modular platforms`

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
- this block is intentionally excluded from the desktop pointer-follow glow effect to preserve readability

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
- desktop-only pointer-follow glow for selected surfaces
- respects `prefers-reduced-motion`

Desktop glow coverage currently includes:
- public header surfaces
- project cards
- catalog/detail header shells
- about section
- private shell surfaces
- admin cards/panels
- auth surfaces

Important exclusion:
- `detail-summary` is deliberately excluded from pointer-follow glow because the effect reduced readability on long-form editorial content

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
- desktop pointer-follow surface glow

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
- both assets were reduced from their original size, but are still heavier than ideal and should eventually be converted to a lighter production format if hero performance becomes a priority

## Where to change what

Change navigation or shell:
- `src/public/components/PublicHeader.tsx`
- `src/public/components/PreferenceSegmentedControl.tsx`
- `src/core/layouts/PublicLayout.tsx`
- `src/styles.css`

Change hero content or behavior:
- `src/public/components/LandingHeroSection.tsx`
- `src/public/components/HeroMorphTitle.tsx`
- `src/public/pages/LandingPage.tsx`
- `src/styles.css`
- `src/images/logo_white.png`
- `src/images/logo_dark.png`

Change project cards or landing sections:
- `src/public/components/ProjectCard.tsx`
- `src/public/components/ProjectCardGrid.tsx`
- `src/public/components/PortfolioSection.tsx`
- `src/public/pages/LandingPage.tsx`
- `src/styles.css`

Change detail view:
- `src/public/components/ProjectDetailHeader.tsx`
- `src/public/components/ProjectDetailSummary.tsx`
- `src/public/pages/ProjectDetailPage.tsx`
- `src/styles.css`

Change translations or preference behavior:
- `src/shared/i18n/*`
- `src/public/preferences.tsx`
