# Frontend Architecture Guide

Этот документ нужен для практической ориентации во frontend-части платформы: что уже сделано, как это работает, где менять поведение, и какие места считаются системообразующими.

## 1. Что делает frontend

Frontend разделен на три большие зоны:
- public showcase: `/`, `/projects`, `/projects/:id`
- private admin workspace: `/app/*`
- plugin/module pages: public и private маршруты, которые подключаются через registry

Текущий стек:
- React
- TypeScript
- Vite
- Framer Motion для переходов и некоторых UI-индикаторов
- собственный lightweight i18n слой
- глобальный CSS без UI-библиотеки

## 2. Точка входа

Файл: `src/main.tsx`

Порядок инициализации:
1. Ищется `#root`.
2. Из `localStorage` восстанавливается auth-session.
3. Эта session передается в `AppRouter`.
4. `AppRouter` уже строит все provider-ы, layouts и routes.

Это значит, что frontend стартует не с layout и не со страницы, а с восстановления session и корневого router.

## 3. Provider tree

Файл: `src/core/routing/AppRouter.tsx`

Фактическое дерево провайдеров:
1. `AuthSessionProvider`
2. `PreferencesProvider`
3. `BrowserRouter`
4. `PublicAnalyticsTracker`
5. `AppRoutes`
6. reauth dialog overlay

Что это дает:
- auth доступен всему приложению;
- тема и язык доступны и public, и admin частям;
- analytics tracker отслеживает только public pages;
- router управляет layout-ами централизованно.

## 4. Routing model

### Public routes
- `/`
- `/login`
- `/projects`
- `/projects/:id`
- public routes модулей из registry

Все они рендерятся через `PublicLayout`.

### Private routes
- `/app`
- `/app/projects`
- `/app/posts`
- `/app/content`
- `/app/security`
- `/app/:slug`
- private routes модулей из registry

Все они проходят через `ProtectedRoute` и затем рендерятся в `PrivateAppLayout`.

### Почему это важно
- layout boundaries жесткие;
- public и private UI не должны смешиваться;
- новые модульные маршруты должны подключаться через `moduleRegistry`, а не хаотично разбрасываться по `AppRouter`.

## 5. Плагинная модель на фронте

Файлы:
- `src/core/plugin-registry/module-contract.ts`
- `src/core/plugin-registry/registry.ts`
- `src/modules/*/*.module.tsx`

Как это работает:
- модуль описывает себя через module contract;
- registry собирает модули автоматически;
- router строит public/private extra-routes из registry;
- core не должен знать детали модуля заранее.

Практический смысл:
- можно добавлять frontend-module без изменения ядра маршрутизации вручную;
- это поддерживает основную идею modular monolith + plugin-style registration.

## 6. Preferences: тема и язык

Файл: `src/public/preferences.tsx`

Что хранится:
- `theme`
- `language`

Где хранится:
- `localStorage`
- дублируется в DOM:
  - `document.documentElement.dataset.theme`
  - `document.documentElement.lang`

Почему это сделано так:
- CSS theme tokens завязаны на `data-theme`;
- язык нужен не только React, но и самому документу;
- это простой и надежный способ без лишней библиотеки состояния.

## 7. i18n слой

Файлы:
- `src/shared/i18n/ru.ts`
- `src/shared/i18n/en.ts`
- `src/shared/i18n/t.ts`
- `src/shared/i18n/get-current-language.ts`

Принцип:
- словари лежат прямо в репозитории;
- `t(key, language, params)` делает lookup;
- внешние i18n-библиотеки не используются.

Это упрощает контроль над текстами и делает слой предсказуемым.

## 8. Public data layer

### `project-store.ts`

Это один из ключевых файлов фронтенда.

Он отвечает за:
- чтение portfolio posts;
- загрузку из public API;
- admin create/update/delete;
- загрузку template bundles через multipart;
- fallback в `localStorage`.

Схема работы:
- public UI читает проекты через hook `useProjectPosts()`;
- hook сначала берет локальный кэш;
- затем пытается подтянуть данные из API;
- при admin mutation frontend сначала пробует сервер;
- если режим допускает fallback, данные пишутся в `localStorage`.

Почему это важно:
- UI не полностью зависит от backend availability;
- local demo/dev режим продолжает работать;
- при `serverOnly` поведение становится строгим и ошибки всплывают явно.

### `landing-content-store.ts`

Почти та же логика, но для landing page content:
- hero texts
- about texts
- portfolio intro texts
- about photo

## 9. Public page composition

### `LandingPage.tsx`

Страница не хранит тяжелую верстку. Она собирает готовые секции:
- `LandingHeroSection`
- `PortfolioSection` для posts
- `PortfolioSection` для projects
- `LandingAboutSection`

Это правильная граница:
- page orchestrates data and navigation;
- components render UI.

### `ProjectsPage.tsx`

Использует:
- `ProjectsCatalogHeader`
- `ProjectCardGrid`
- popup/preview связанный слой

### `ProjectDetailPage.tsx`

Собрана из:
- `ProjectDetailHeader`
- `ProjectDetailSummary`
- `ProjectScreensGallery`
- `ProjectLightbox`
- `ProjectNotFoundCard`

## 10. Public UI components

### `PublicHeader.tsx`
- public navigation;
- mobile menu toggle;
- combined preferences panel;
- animation between active nav items.

### `PreferenceSegmentedControl.tsx`
- базовый segmented control для theme/language;
- использует shared `layoutId`, чтобы active capsule плавно перетекала между опциями.

### `ProjectCard.tsx`
- интерактивная карточка проекта;
- hover pointer tracking для glass-light position;
- touch logic: сначала expand, потом navigate;
- marquee tags и collapsible details.

### `LiquidGlass.tsx`
- reusable surface для стеклянных блоков;
- pointer-driven sheen;
- 3D tilt только на pointer devices.

Не все секции обязаны использовать `LiquidGlass`. Hero, например, сейчас может быть отдельной surface-реализацией, если нужен другой визуальный режим.

## 11. CSS architecture

Файл: `src/styles.css`

Это не просто набор классов, а фактически дизайн-система проекта.

Большие зоны файла:
- tokens и theme variables
- base elements
- shared surfaces / liquid-glass
- public layout and navigation
- hero and rotating earth
- project cards and detail page
- admin layout and admin cards
- responsive breakpoints

Что важно понимать:
- многие блоки используют одни и те же surface-паттерны;
- `styles.css` сейчас централизован, поэтому любые визуальные правки нужно делать аккуратно: один селектор может влиять сразу на несколько экранов;
- legacy- и newer public styles местами сосуществуют, поэтому стоит постепенно вычищать дубли, а не вносить хаотичные правки.

## 12. Анимации

### Где используются
- `AnimatePresence` в router transitions
- `motion.article` в карточках
- animated nav indicator в public menu
- segmented control indicator
- CSS orbit animation в `RotatingEarth`

### Принцип
- смысловые анимации оставлены;
- при `prefers-reduced-motion: reduce` они отключаются глобально.

## 13. Admin frontend

Основные экраны лежат в `src/core/pages`:
- `AdminOverviewPage.tsx`
- `AdminProjectsWorkspace.tsx`
- `AdminLandingContentPage.tsx`
- `AdminSecurityPage.tsx`
- `DynamicProjectViewer.tsx`

Это не отдельное приложение, а private zone внутри того же frontend.

Связанные ключевые файлы:
- `src/core/layouts/PrivateAppLayout.tsx`
- `src/core/auth/auth-session.tsx`
- `src/core/auth/auth-api.ts`

## 14. Где менять что

### Хочу поменять меню
- `src/public/components/PublicHeader.tsx`
- `src/public/components/PreferenceSegmentedControl.tsx`
- `src/styles.css`

### Хочу поменять hero
- `src/public/components/LandingHeroSection.tsx`
- `src/public/components/RotatingEarth.tsx`
- `src/styles.css`

### Хочу поменять карточки
- `src/public/components/ProjectCard.tsx`
- `src/public/components/ProjectCardGrid.tsx`
- `src/styles.css`

### Хочу поменять тексты/язык
- `src/shared/i18n/*`
- `src/public/preferences.tsx`
- content stores, если речь о runtime/editable текстах

### Хочу поменять данные landing page
- `src/public/data/landing-content-store.ts`
- admin экран: `src/core/pages/AdminLandingContentPage.tsx`

### Хочу поменять поведение проектов и загрузку шаблонов
- `src/public/data/project-store.ts`
- admin экран: `src/core/pages/AdminProjectsWorkspace.tsx`

## 15. Что считать сложными местами

Это зоны, где лучше сначала читать код, а потом менять:
- `project-store.ts`
- `AppRouter.tsx`
- `styles.css`
- `ProjectCard.tsx`
- `PublicHeader.tsx`

Причина:
- в этих файлах смешиваются поведение, UX и cross-cutting concerns;
- неаккуратные правки там быстро ломают несколько экранов сразу.

## 16. Recommended cleanup path

Если продолжать улучшать frontend системно, порядок лучше такой:
1. дальше чистить legacy/double selectors в `styles.css`
2. вынести design tokens и surface-helpers в более явные секции
3. документировать admin pages так же подробно, как public block layer
4. покрыть критические flows дополнительными тестами: menu state, preferences, project mutations
5. отдельно документировать visual conventions: что считается button, tag, surface, hero, section heading

## 17. Summary

Текущее состояние frontend-а уже достаточно структурировано:
- маршруты централизованы;
- public UI разложен на компоненты;
- plugin registration встроен;
- тема/язык и content stores централизованы;
- public/admin зоны разделены корректно.

Главная ценность текущей структуры — не в красоте дерева файлов, а в том, что page-level orchestration, reusable UI blocks, stores и routing responsibilities уже разведены по разным слоям.