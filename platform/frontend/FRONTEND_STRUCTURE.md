# Frontend Structure

Root: `platform/frontend`

Main companion doc:
- `FRONTEND_ARCHITECTURE.md` — объясняет, как устроен frontend, как текут данные, где что менять.

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
   |  |  |- SectionHeading.tsx
   |  |  `- SpaceBackground.tsx
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
   |  `- i18n/
   |     |- en.ts
   |     |- get-current-language.ts
   |     |- index.ts
   |     |- ru.ts
   |     `- t.ts
   `- test/
      `- setupTests.ts
```

## What Lives Where

### `src/main.tsx`
- Bootstrap React.
- Восстанавливает auth session из `localStorage`.
- Передает session в `AppRouter`.

### `src/core`
- Каркас приложения.
- Auth, routing, layouts, admin pages, plugin-registry.
- Это зона, где определяется поведение всего frontend, а не конкретной public-секции.

### `src/public`
- Публичная витрина и shared frontend-state для темы, языка, landing content, portfolio posts.
- `pages/` держат только композицию страницы и page-level state.
- `components/` — переиспользуемые UI-блоки.
- `data/` — stores и seed-данные.

### `src/modules`
- Плагинные frontend-модули.
- Подключаются через registry, а не ручным импортом в router.

### `src/shared/i18n`
- Простая встроенная i18n-слойка без внешних библиотек.
- `t.ts` — lookup и interpolation.
- `ru.ts` / `en.ts` — словари.

### `src/styles.css`
- Глобальная дизайн-система фронтенда.
- Здесь лежат theme tokens, public/admin shells, liquid-glass surfaces, hero/card/menu styles, responsive rules.

## Public Composition

- `PublicHeader.tsx` — public navigation + combined control surface для theme/language.
- `LandingHeroSection.tsx` — первый экран и планета.
- `PortfolioSection.tsx` — общий wrapper для секций карточек.
- `ProjectCardGrid.tsx` + `ProjectCard.tsx` — каталог карточек и карточка.
- `ProjectsCatalogHeader.tsx` — верхняя шапка каталога `/projects`.
- `ProjectDetailHeader.tsx`, `ProjectDetailSummary.tsx`, `ProjectScreensGallery.tsx`, `ProjectLightbox.tsx` — detail page.
- `LandingAboutSection.tsx` — about block.

## State and Data

- `preferences.tsx`:
  - хранит тему и язык;
  - синхронизирует `document.documentElement.dataset.theme` и `lang`;
  - пишет значения в `localStorage`.
- `project-store.ts`:
  - public fetch через `/api/public/projects`;
  - admin mutations через `/api/app/projects`;
  - fallback в `localStorage`, если API недоступен или разрешен local-only режим.
- `landing-content-store.ts`:
  - та же схема, но для landing content.

## Fast Orientation

Если нужно изменить что-то конкретное:
- меню и public shell: `src/public/components/PublicHeader.tsx`, `src/styles.css`
- hero: `src/public/components/LandingHeroSection.tsx`, `src/public/components/RotatingEarth.tsx`, `src/styles.css`
- карточки: `src/public/components/ProjectCard.tsx`, `src/public/components/ProjectCardGrid.tsx`, `src/styles.css`
- каталог и detail: `src/public/pages/*`, `src/public/components/Project*`
- тема и язык: `src/public/preferences.tsx`, `src/shared/i18n/*`
- admin CRUD: `src/core/pages/AdminProjectsWorkspace.tsx`, `src/public/data/project-store.ts`

## Current Frontend Direction

Фронтенд уже разложен по композиционным блокам. Правильный путь дальнейшей работы:
- не раздувать `pages/`;
- новые UI-фрагменты выносить в `public/components/`;
- state держать в provider/store, а не внутри layout;
- маршруты модулей добавлять через registry, а не вручную в core router.