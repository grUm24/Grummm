# Frontend Architecture Guide

Этот документ описывает текущее устройство фронтенда после полного visual reset: что осталось неизменным по бизнес-логике, как устроены layout boundaries, где живут данные, и в каких файлах менять UI.

## 1. Что считается стабильным

Во фронтенде нельзя ломать следующие вещи:
- публичная зона: `/`, `/projects`, `/projects/:id`
- приватная зона: `/app/*`
- frontend plugin discovery через `moduleRegistry`
- тему и язык интерфейса
- data flow через `project-store.ts` и `landing-content-store.ts`
- auth session и `ProtectedRoute`

Текущий курс фронтенда:
- логика, stores и API-контракты сохраняются
- визуальная композиция и HTML-структура могут меняться
- layout и routing остаются жестко разделены на public/private

## 2. Entry Point

Файл: `src/main.tsx`

Порядок инициализации:
1. ищется `#root`
2. из `localStorage` восстанавливается auth session
3. session передается в `AppRouter`
4. `AppRouter` поднимает auth, preferences и router tree

Это означает, что приложение стартует не со страницы, а с восстановления пользовательского состояния.

## 3. Provider Tree

Файл: `src/core/routing/AppRouter.tsx`

Фактический provider tree:
1. `AuthSessionProvider`
2. `PreferencesProvider`
3. `BrowserRouter`
4. `PublicAnalyticsTracker`
5. route tree
6. reauth dialog overlay

Что это дает:
- auth доступен всей private зоне и admin flow
- theme/language едины для public и private части
- public analytics не вмешивается в `/app/*`
- reauth живет поверх всего приложения, а не внутри отдельных страниц

## 4. Routing Model

### Public
Рендерится через `PublicLayout`:
- `/`
- `/login`
- `/projects`
- `/projects/:id`
- public routes модулей из `moduleRegistry`

### Private
Рендерится через `ProtectedRoute` + `PrivateAppLayout`:
- `/app`
- `/app/projects`
- `/app/posts`
- `/app/content`
- `/app/security`
- `/app/:slug`
- private routes модулей из `moduleRegistry`

### Почему это важно
Раньше layout мог визуально сбрасываться между маршрутами. Сейчас router построен как nested layout tree через `Outlet`, поэтому public/private shell остаются смонтированными, а меняется только контентная часть.

Ключевые файлы:
- `src/core/routing/AppRouter.tsx`
- `src/core/routing/ProtectedRoute.tsx`
- `src/core/layouts/PublicLayout.tsx`
- `src/core/layouts/PrivateAppLayout.tsx`

## 5. Layout Shells

### `PublicLayout`
Отвечает за:
- persistent public header
- общий shell публичной зоны
- подключение GSAP enhancements для public pages

Структура:
- `.public-layout`
- `.public-layout__shell`
- `PublicHeader`
- `.public-layout__content`
- `Outlet`

### `PrivateAppLayout`
Отвечает за:
- private topbar
- sidebar navigation
- session countdown
- theme toggle и logout
- mobile navigation state

Структура:
- `.private-layout`
- `.private-layout__shell-frame`
- topbar
- aside navigation
- main content через `Outlet`

## 6. Preferences: Theme + Language

Файл: `src/public/preferences.tsx`

Хранится:
- `theme`
- `language`

Источник данных:
- `localStorage`
- `document.documentElement.dataset.theme`
- `document.documentElement.lang`

Поведение:
- если тема не сохранена, используется `prefers-color-scheme`
- если язык не сохранен, используется `navigator.language`
- переключатели темы и языка не завязаны на внешнюю библиотеку

Это важная часть контракта: любые UI-переделки должны использовать именно этот слой, а не вводить новый глобальный state.

## 7. i18n Layer

Файлы:
- `src/shared/i18n/ru.ts`
- `src/shared/i18n/en.ts`
- `src/shared/i18n/t.ts`
- `src/shared/i18n/get-current-language.ts`

Принцип:
- словари лежат в репозитории
- `t(key, language, params)` делает lookup и подстановку параметров
- сторонние i18n-библиотеки не используются

Это сделано намеренно: тексты контролируются напрямую, без runtime-магии и без зависимости от внешнего i18n-фреймворка.

## 8. Plugin Model on Frontend

Файлы:
- `src/core/plugin-registry/module-contract.ts`
- `src/core/plugin-registry/registry.ts`
- `src/modules/*/*.module.tsx`

Как это работает:
- модуль описывает свои public/private pages через contract
- registry собирает модули автоматически
- router строит public/private routes на основе registry
- core router не должен импортировать модуль вручную

Это одна из ключевых архитектурных гарантий проекта. Любая новая frontend-фича для модулей должна идти через registry.

## 9. Data Layer

### `project-store.ts`
Ключевой store для portfolio/projects.

Отвечает за:
- public fetch проектов
- admin CRUD
- загрузку медиа и template bundles
- fallback в `localStorage`

Принцип:
- frontend сначала пытается работать через API
- при отсутствии backend/token возможен controlled fallback
- UI не должен напрямую работать с `fetch` для проектов, если уже есть store API

### `landing-content-store.ts`
Тот же паттерн, но для landing content:
- hero copy
- about copy
- portfolio intro
- about image

## 10. Public UI Composition

### `PublicHeader.tsx`
Содержит:
- brand block
- public navigation
- preferences panel
- mobile menu
- animated active indicator

Важно:
- header живет в `PublicLayout`, а не внутри страниц
- он не должен размонтироваться между public routes
- его анимации должны быть максимально сдержанными, без route-reset эффекта

### `LandingHeroSection.tsx`
Главный экран публичной части.

Содержит:
- headline copy
- hero description
- CTA/actions
- highlights
- `RotatingEarth`

Hero сейчас построен как editorial split-layout: текст важнее декора и должен занимать основную площадь.

### `PortfolioSection.tsx`
Универсальная секция для списков карточек. Используется для curated posts и project listing blocks.

### `ProjectCard.tsx`
Новая карточка проекта после reset.

Содержит:
- media preview
- meta row
- title + description
- tags
- expandable details

Карточка не должна содержать сложную бизнес-логику. Она только отображает данные и отдает наружу события выбора/навигации.

### `ProjectDetailHeader.tsx` и `ProjectDetailSummary.tsx`
Формируют detail page.

Текущий принцип detail summary:
- обложка имеет вторичный приоритет
- текстовая колонка шире и визуально доминирует
- layout ближе к editorial reading surface, чем к media showcase

## 11. Private/Admin UI Composition

Основные страницы лежат в `src/core/pages`:
- `AdminOverviewPage.tsx`
- `AdminProjectsWorkspace.tsx`
- `AdminLandingContentPage.tsx`
- `AdminSecurityPage.tsx`
- `DynamicProjectViewer.tsx`

Это не отдельное приложение. Это private зона того же React SPA.

Что важно:
- admin shell задается `PrivateAppLayout`
- страницы не должны тащить в себя shell-логику
- CRUD и upload flows должны использовать существующие stores/API helpers

## 12. Motion Layer

Файл: `src/shared/ui/useGsapEnhancements.ts`

Текущий motion-contract:
- `[data-gsap='reveal']` для мягкого появления контейнеров
- `[data-gsap='stagger']` для stagger children
- `[data-gsap-button]` для hover/press motion
- поддерживается `prefers-reduced-motion`

Принципы:
- GSAP используется как enhancement, а не как источник layout-логики
- motion не должен ломать routing, focus или accessibility
- transforms на кнопках централизованы здесь, чтобы не конфликтовать с CSS hover

## 13. CSS Architecture

Файл: `src/styles.css`

Это единая дизайн-система фронтенда. Здесь лежат:
- theme tokens
- base typography and spacing
- public shell
- private shell
- cards, inputs, buttons, tags
- detail page layout
- responsive rules

Текущий подход после reset:
- минималистичная система поверх React-композиции
- без визуального наследия старого glass-heavy слоя
- mobile-first правила важнее desktop overrides

Если меняется HTML-композиция компонента, почти всегда нужно синхронно обновлять `styles.css`.

## 14. Где менять что

Хочу менять меню:
- `src/public/components/PublicHeader.tsx`
- `src/public/components/PreferenceSegmentedControl.tsx`
- `src/styles.css`

Хочу менять hero:
- `src/public/components/LandingHeroSection.tsx`
- `src/public/components/HeroActions.tsx`
- `src/public/components/HeroHighlights.tsx`
- `src/public/components/RotatingEarth.tsx`
- `src/styles.css`

Хочу менять карточки и каталог:
- `src/public/components/ProjectCard.tsx`
- `src/public/components/ProjectCardGrid.tsx`
- `src/public/components/ProjectsCatalogHeader.tsx`
- `src/styles.css`

Хочу менять detail page:
- `src/public/components/ProjectDetailHeader.tsx`
- `src/public/components/ProjectDetailSummary.tsx`
- `src/public/components/ProjectScreensGallery.tsx`
- `src/public/components/ProjectLightbox.tsx`
- `src/styles.css`

Хочу менять админку:
- `src/core/layouts/PrivateAppLayout.tsx`
- `src/core/pages/*`
- `src/styles.css`

Хочу менять theme/language:
- `src/public/preferences.tsx`
- `src/shared/i18n/*`

Хочу менять данные landing/projects:
- `src/public/data/landing-content-store.ts`
- `src/public/data/project-store.ts`

## 15. Сложные места, которые нельзя править вслепую

Сначала читать, потом менять:
- `AppRouter.tsx`
- `ProtectedRoute.tsx`
- `project-store.ts`
- `landing-content-store.ts`
- `PrivateAppLayout.tsx`
- `PublicHeader.tsx`
- `styles.css`

Причина простая: это файлы, где пересекаются routing, UX, persistence и cross-cutting behavior.

## 16. Практический вывод

Сейчас фронтенд организован так:
- бизнес-логика и stores сохранены
- HTML-композиция UI уже пересобирается независимо от logic layer
- layout boundaries закреплены через persistent layouts
- тема и язык централизованы
- plugin-модель сохранена

Правильный путь дальнейшей работы:
- продолжать менять композицию компонентов, а не размазывать логику по страницам
- держать persistent shell стабильным
- не обходить stores прямыми запросами из случайных компонентов
- синхронизировать docs при изменении router/layout contract
