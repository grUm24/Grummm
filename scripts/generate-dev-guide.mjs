import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, TabStopPosition, TabStopType,
  convertInchesToTwip
} from "docx";
import { writeFileSync } from "fs";

/* ─── helpers ─── */
const FONT = "Segoe UI";
const FONT_MONO = "Cascadia Code";
const BLUE = "2563EB";
const GRAY = "6B7280";
const DARK = "1F2937";
const LIGHT_BG = "F3F4F6";
const WHITE = "FFFFFF";

const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 120 },
    ...opts,
    children: Array.isArray(text) ? text : [new TextRun({ text, font: FONT, size: 22, color: DARK, ...opts.run })],
  });

const heading = (text, level = HeadingLevel.HEADING_1) =>
  new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 400 : 280, after: 160 },
    children: [
      new TextRun({
        text,
        font: FONT,
        bold: true,
        size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 26 : 22,
        color: level === HeadingLevel.HEADING_1 ? BLUE : DARK,
      }),
    ],
  });

const bullet = (text, level = 0) =>
  new Paragraph({
    bullet: { level },
    spacing: { after: 80 },
    children: Array.isArray(text) ? text : [new TextRun({ text, font: FONT, size: 22, color: DARK })],
  });

const code = (lines) =>
  lines.map(
    (line) =>
      new Paragraph({
        spacing: { after: 0 },
        shading: { type: ShadingType.CLEAR, fill: "1E1E1E" },
        indent: { left: convertInchesToTwip(0.15), right: convertInchesToTwip(0.15) },
        children: [new TextRun({ text: line || " ", font: FONT_MONO, size: 20, color: "D4D4D4" })],
      })
  );

const note = (text) =>
  new Paragraph({
    spacing: { before: 120, after: 120 },
    shading: { type: ShadingType.CLEAR, fill: "DBEAFE" },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
    children: [
      new TextRun({ text: "Важно: ", font: FONT, size: 22, bold: true, color: BLUE }),
      new TextRun({ text, font: FONT, size: 22, color: DARK }),
    ],
  });

const warn = (text) =>
  new Paragraph({
    spacing: { before: 120, after: 120 },
    shading: { type: ShadingType.CLEAR, fill: "FEF3C7" },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
    children: [
      new TextRun({ text: "Внимание: ", font: FONT, size: 22, bold: true, color: "B45309" }),
      new TextRun({ text, font: FONT, size: 22, color: DARK }),
    ],
  });

const spacer = () => new Paragraph({ spacing: { after: 80 }, children: [] });

const numberedStep = (num, title, details) => [
  new Paragraph({
    spacing: { before: 160, after: 80 },
    children: [
      new TextRun({ text: `${num}. `, font: FONT, size: 22, bold: true, color: BLUE }),
      new TextRun({ text: title, font: FONT, size: 22, bold: true, color: DARK }),
    ],
  }),
  ...(details || []),
];

/* ─── document ─── */
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FONT, size: 22, color: DARK } },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.8),
            bottom: convertInchesToTwip(0.8),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
          },
        },
      },
      children: [
        /* ═══════ TITLE ═══════ */
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [
            new TextRun({ text: "Grummm Platform", font: FONT, size: 44, bold: true, color: BLUE }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new TextRun({ text: "Руководство разработчика", font: FONT, size: 32, color: DARK }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: "Настройка среды, запуск, работа с Git, деплой", font: FONT, size: 22, color: GRAY }),
          ],
        }),

        /* ═══════ 1. WHAT YOU NEED ═══════ */
        heading("1. Что нужно установить"),
        p("Перед началом работы установи следующие программы. Все бесплатные."),
        spacer(),

        heading("1.1  Git", HeadingLevel.HEADING_2),
        p("Git — система контроля версий. Через неё мы храним и синхронизируем код."),
        ...numberedStep(1, "Скачай Git для Windows", [
          p("https://git-scm.com/download/win", { run: { color: BLUE } }),
        ]),
        ...numberedStep(2, "Установи с настройками по умолчанию", [
          p("На шаге 'Adjusting your PATH' выбери 'Git from the command line and also from 3rd-party software'."),
        ]),
        ...numberedStep(3, "Проверь установку — открой терминал (cmd или PowerShell) и набери:", [
          ...code(["git --version"]),
          p("Должно показать версию, например: git version 2.47.0", { run: { color: GRAY } }),
        ]),
        ...numberedStep(4, "Настрой имя и email (будут видны в истории коммитов):", [
          ...code([
            'git config --global user.name "Твоё Имя"',
            'git config --global user.email "твой-email@example.com"',
          ]),
        ]),
        spacer(),

        heading("1.2  Docker Desktop", HeadingLevel.HEADING_2),
        p("Docker — запускает backend, базу данных и frontend в изолированных контейнерах. Не нужно устанавливать .NET, PostgreSQL, Node.js вручную — всё внутри Docker."),
        ...numberedStep(1, "Скачай Docker Desktop для Windows", [
          p("https://www.docker.com/products/docker-desktop/", { run: { color: BLUE } }),
        ]),
        ...numberedStep(2, "Установи и перезагрузи компьютер, если попросит"),
        ...numberedStep(3, "Запусти Docker Desktop — дождись зелёной иконки в трее"),
        ...numberedStep(4, "Проверь в терминале:", [
          ...code(["docker --version", "docker compose version"]),
        ]),
        note("Docker Desktop должен быть запущен (иконка в трее) каждый раз, когда ты работаешь с проектом."),
        spacer(),

        heading("1.3  Node.js", HeadingLevel.HEADING_2),
        p("Node.js нужен для работы с frontend-зависимостями и запуска скриптов."),
        ...numberedStep(1, "Скачай LTS-версию (не Current!)", [
          p("https://nodejs.org/", { run: { color: BLUE } }),
        ]),
        ...numberedStep(2, "Установи с настройками по умолчанию"),
        ...numberedStep(3, "Проверь:", [
          ...code(["node --version", "npm --version"]),
        ]),
        spacer(),

        heading("1.4  VS Code (редактор кода)", HeadingLevel.HEADING_2),
        p("Бесплатный редактор от Microsoft. Можно использовать другой, но VS Code — стандарт в команде."),
        ...numberedStep(1, "Скачай", [
          p("https://code.visualstudio.com/", { run: { color: BLUE } }),
        ]),
        ...numberedStep(2, "Рекомендуемые расширения (Extensions) — установи через боковую панель:", [
          bullet("ESLint — подсветка ошибок в JS/TS"),
          bullet("Prettier — автоформатирование кода"),
          bullet("Docker — управление контейнерами из VS Code"),
          bullet("GitLens — расширенная работа с Git"),
        ]),
        spacer(),

        heading("1.5  GitHub аккаунт", HeadingLevel.HEADING_2),
        p("Если у тебя ещё нет аккаунта — зарегистрируйся на https://github.com"),
        p("Сообщи свой username лиду — он добавит тебя в репозиторий."),
        spacer(),

        /* ═══════ 2. CLONE ═══════ */
        heading("2. Клонирование проекта"),
        p("После того как лид добавил тебя в репозиторий:"),
        ...numberedStep(1, "Открой терминал и перейди в папку, где хочешь хранить проект:", [
          ...code(["cd C:\\Users\\ТвоёИмя\\Documents"]),
        ]),
        ...numberedStep(2, "Клонируй репозиторий:", [
          ...code(["git clone https://github.com/Grumz18/Grummm.git"]),
        ]),
        ...numberedStep(3, "Перейди в папку проекта:", [
          ...code(["cd Grummm"]),
        ]),
        ...numberedStep(4, "Открой проект в VS Code:", [
          ...code(["code ."]),
        ]),
        p("Теперь у тебя полная копия проекта на компьютере."),
        spacer(),

        /* ═══════ 3. RUN DEV ═══════ */
        heading("3. Запуск dev-окружения"),
        note("Убедись, что Docker Desktop запущен (зелёная иконка в трее)."),
        spacer(),

        ...numberedStep(1, "Открой терминал в папке проекта и запусти:", [
          ...code(["docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build"]),
        ]),
        p("Что произойдёт:", { run: { bold: true } }),
        bullet("Docker скачает нужные образы (первый раз — 5-10 минут)"),
        bullet("Соберёт backend (.NET) и поднимет базу данных (PostgreSQL)"),
        bullet("Запустит frontend (Vite dev server) с горячей перезагрузкой"),
        spacer(),

        ...numberedStep(2, "Дождись строки в логах:", [
          ...code(["frontend-1  |   VITE v5.x.x  ready in XXX ms", "frontend-1  |   ➜  Local:   http://localhost:5173/"]),
        ]),

        ...numberedStep(3, "Открой в браузере:", [
          p("http://localhost:5173", { run: { color: BLUE, bold: true } }),
        ]),

        ...numberedStep(4, "Для входа в админ-панель (http://localhost:5173/login):", [
          bullet("Логин: admin"),
          bullet("Пароль: admin123"),
          p("Email-код в dev-режиме не нужен."),
        ]),
        spacer(),

        heading("3.1  Как остановить", HeadingLevel.HEADING_2),
        p("В терминале, где запущен Docker, нажми Ctrl+C. Или в другом терминале:"),
        ...code(["docker compose -f docker-compose.yml -f docker-compose.dev.yml down"]),
        spacer(),

        heading("3.2  Как перезапустить после изменений backend", HeadingLevel.HEADING_2),
        p("Frontend обновляется автоматически (HMR). Если ты изменил код backend (.NET), перезапусти его:"),
        ...code(["docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build backend"]),
        spacer(),

        heading("3.3  Как сбросить базу данных", HeadingLevel.HEADING_2),
        p("Если БД в плохом состоянии и хочешь начать с чистого листа:"),
        ...code([
          "docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v",
          "docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build",
        ]),
        warn("Флаг -v удаляет все данные dev-базы. Production это не затрагивает."),
        spacer(),

        /* ═══════ 4. PROJECT STRUCTURE ═══════ */
        heading("4. Структура проекта"),
        p("Краткая карта — где что лежит:"),
        spacer(),
        ...code([
          "Grummm/",
          "├── platform/",
          "│   ├── frontend/          ← React + TypeScript (Vite)",
          "│   │   └── src/",
          "│   │       ├── core/      ← админ-панель, роутинг, авторизация",
          "│   │       ├── public/    ← публичные страницы (лендинг, посты)",
          "│   │       ├── modules/   ← модули (task-tracker и др.)",
          "│   │       └── shared/    ← общие утилиты, i18n",
          "│   ├── backend/           ← .NET 9 (C#)",
          "│   │   └── src/",
          "│   │       ├── WebAPI/    ← точка входа, конфиги",
          "│   │       ├── Core/      ← доменные модели",
          "│   │       ├── Infrastructure/ ← БД, email, аудит",
          "│   │       └── Modules/   ← модули (Analytics, ProjectPosts, ...)",
          "│   └── infra/             ← nginx, postgres, Docker-конфиги",
          "├── docker-compose.yml     ← базовая конфигурация",
          "├── docker-compose.dev.yml ← dev-окружение (ты используешь это)",
          "└── scripts/               ← вспомогательные скрипты",
        ]),
        spacer(),
        p("Ты будешь работать в основном в папке platform/frontend/src/ (frontend) или platform/backend/src/ (backend)."),
        spacer(),

        /* ═══════ 5. GIT WORKFLOW ═══════ */
        heading("5. Работа с Git — пошагово"),
        warn("Никогда не пуш напрямую в ветку main. Только через Pull Request с ревью."),
        spacer(),

        heading("5.1  Создание ветки", HeadingLevel.HEADING_2),
        p("Перед началом каждой задачи создавай новую ветку от main:"),
        ...code([
          "git checkout main            # переключись на main",
          "git pull origin main         # получи свежий код",
          "git checkout -b feature/название-фичи",
        ]),
        spacer(),
        p("Примеры названий веток:", { run: { bold: true } }),
        bullet("feature/add-search-page — новая функциональность"),
        bullet("fix/broken-login-button — исправление бага"),
        bullet("refactor/cleanup-api-calls — рефакторинг"),
        spacer(),
        p("Правила именования:", { run: { bold: true } }),
        bullet("Только латиница, строчные буквы"),
        bullet("Слова через дефис (не пробелы, не подчёркивания)"),
        bullet("Префикс: feature/ fix/ refactor/ docs/"),
        spacer(),

        heading("5.2  Работа с кодом и коммиты", HeadingLevel.HEADING_2),
        p("Пока ты работаешь, периодически сохраняй прогресс коммитами:"),
        ...code([
          "git status                   # посмотри что изменилось",
          "git add .                    # добавь все изменения",
          'git commit -m "описание"    # сохрани коммит',
        ]),
        spacer(),

        p("Как писать сообщения коммитов:", { run: { bold: true } }),
        spacer(),
        p("Формат:", { run: { bold: true } }),
        ...code(["тип: краткое описание на русском или английском"]),
        spacer(),
        p("Типы:", { run: { bold: true } }),
        bullet("feat: — новая функциональность"),
        bullet("fix: — исправление бага"),
        bullet("refactor: — рефакторинг (без изменения поведения)"),
        bullet("style: — оформление (CSS, отступы, форматирование)"),
        bullet("docs: — документация"),
        bullet("chore: — мелочи (конфиги, зависимости)"),
        spacer(),

        p("Примеры хороших коммитов:", { run: { bold: true, color: "16A34A" } }),
        ...code([
          'git commit -m "feat: добавить страницу поиска проектов"',
          'git commit -m "fix: исправить ошибку при загрузке аватара"',
          'git commit -m "style: обновить стили карточки проекта"',
        ]),
        spacer(),
        p("Примеры плохих коммитов:", { run: { bold: true, color: "DC2626" } }),
        ...code([
          'git commit -m "fix"              # непонятно что исправлено',
          'git commit -m "обновления"       # ничего не говорит',
          'git commit -m "adsflkgjh"        # бессмысленно',
        ]),
        spacer(),
        note("Один коммит = одно логическое изменение. Не складывай 10 разных правок в один коммит."),
        spacer(),

        heading("5.3  Отправка ветки на GitHub", HeadingLevel.HEADING_2),
        p("Когда задача готова (или хочешь показать промежуточный результат):"),
        ...code(["git push -u origin feature/название-фичи"]),
        p("Флаг -u нужен только при первом пуше ветки. Дальше достаточно просто:"),
        ...code(["git push"]),
        spacer(),

        heading("5.4  Создание Pull Request", HeadingLevel.HEADING_2),
        p("После пуша ветки нужно создать Pull Request (PR) — запрос на слияние твоего кода в main."),
        spacer(),

        ...numberedStep(1, "Открой репозиторий на GitHub в браузере", [
          p("https://github.com/Grumz18/Grummm", { run: { color: BLUE } }),
        ]),
        ...numberedStep(2, 'GitHub покажет баннер "Compare & pull request" — нажми на него'),
        ...numberedStep(3, "Заполни Pull Request:", [
          bullet([
            new TextRun({ text: "Title", font: FONT, size: 22, bold: true, color: DARK }),
            new TextRun({ text: " — кратко: что сделано (например: 'Добавить страницу поиска')", font: FONT, size: 22, color: DARK }),
          ]),
          bullet([
            new TextRun({ text: "Description", font: FONT, size: 22, bold: true, color: DARK }),
            new TextRun({ text: " — подробнее:", font: FONT, size: 22, color: DARK }),
          ]),
          bullet("Что было сделано и зачем", 1),
          bullet("Что проверить / как тестировать", 1),
          bullet("Скриншоты (если менял UI)", 1),
        ]),
        ...numberedStep(4, 'Нажми "Create Pull Request"'),
        spacer(),

        p("Пример описания PR:", { run: { bold: true } }),
        ...code([
          "## Что сделано",
          "- Добавлена страница поиска проектов",
          "- Поиск работает по названию и описанию",
          "- Добавлена debounce-задержка 300ms",
          "",
          "## Как проверить",
          "- Открыть http://localhost:5173/projects",
          "- Ввести текст в поле поиска",
          "- Проверить что результаты фильтруются",
          "",
          "## Скриншоты",
          "[вставь скриншот]",
        ]),
        spacer(),

        heading("5.5  Ожидание ревью", HeadingLevel.HEADING_2),
        p("После создания PR:"),
        bullet("Лид получит уведомление и проверит твой код"),
        bullet("Он может оставить комментарии к конкретным строкам — ты увидишь их в PR на GitHub"),
        bullet("Если есть замечания — исправь код в своей ветке, закоммить и запуш:"),
        ...code([
          "# исправляешь код...",
          "git add .",
          'git commit -m "fix: исправить замечания по ревью"',
          "git push",
        ]),
        p("PR обновится автоматически — лид увидит новые коммиты."),
        spacer(),
        bullet([
          new TextRun({ text: "Когда лид нажмёт 'Approve' и 'Merge' — ", font: FONT, size: 22, color: DARK }),
          new TextRun({ text: "твой код попадёт в main и автоматически задеплоится на production.", font: FONT, size: 22, bold: true, color: DARK }),
        ]),
        spacer(),
        note("Не мержи PR сам! Дождись одобрения (Approve) от лида."),
        spacer(),

        heading("5.6  После мержа — начни новую задачу", HeadingLevel.HEADING_2),
        p("Когда PR замержен, вернись на main и обнови:"),
        ...code([
          "git checkout main",
          "git pull origin main",
          "git checkout -b feature/следующая-задача",
        ]),
        spacer(),

        /* ═══════ 6. COMMON COMMANDS ═══════ */
        heading("6. Шпаргалка — частые команды"),
        spacer(),

        heading("Git", HeadingLevel.HEADING_3),
        ...code([
          "git status                   # что изменилось",
          "git diff                     # посмотреть diff (изменения в файлах)",
          "git log --oneline -10        # последние 10 коммитов",
          "git add .                    # добавить все файлы в коммит",
          'git commit -m "сообщение"   # создать коммит',
          "git push                     # отправить на GitHub",
          "git pull origin main         # получить свежий код из main",
          "git checkout main            # переключиться на main",
          "git checkout -b feature/xxx  # создать новую ветку",
          "git branch                   # список веток (* = текущая)",
        ]),
        spacer(),

        heading("Docker (dev-окружение)", HeadingLevel.HEADING_3),
        ...code([
          "# Запустить dev",
          "docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build",
          "",
          "# Остановить",
          "docker compose -f docker-compose.yml -f docker-compose.dev.yml down",
          "",
          "# Пересобрать только backend",
          "docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build backend",
          "",
          "# Сбросить БД",
          "docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v",
          "",
          "# Посмотреть логи backend",
          "docker logs platform-backend --tail 50",
          "",
          "# Подключиться к dev базе",
          "docker exec -it platform-postgres psql -U platform_dev -d platform_dev",
        ]),
        spacer(),

        /* ═══════ 7. TROUBLESHOOTING ═══════ */
        heading("7. Частые проблемы"),
        spacer(),

        heading("Docker не запускается", HeadingLevel.HEADING_3),
        bullet("Убедись что Docker Desktop запущен (зелёная иконка в трее)"),
        bullet("Перезагрузи Docker Desktop"),
        bullet("Если ошибка про WSL — установи WSL 2: wsl --install в PowerShell от имени администратора"),
        spacer(),

        heading("Порт уже занят (port already in use)", HeadingLevel.HEADING_3),
        bullet("Останови предыдущие контейнеры: docker compose ... down"),
        bullet("Или проверь что занимает порт: netstat -ano | findstr :5173"),
        spacer(),

        heading("npm install ошибки", HeadingLevel.HEADING_3),
        bullet("Удали node_modules и попробуй снова:"),
        ...code(["rm -rf node_modules", "npm install"]),
        spacer(),

        heading("git push отклонён", HeadingLevel.HEADING_3),
        bullet("Если пушишь в main — так и задумано! Работай в своей ветке (feature/...)"),
        bullet("Если ветка отстала от main:"),
        ...code([
          "git checkout main",
          "git pull origin main",
          "git checkout feature/твоя-ветка",
          "git merge main",
          "# реши конфликты если есть, закоммить",
          "git push",
        ]),
        spacer(),

        /* ═══════ 8. CONTACTS ═══════ */
        heading("8. Контакты"),
        p("Если что-то не работает или непонятно — не трать часы на отладку, пиши лиду."),
        p("Лучше спросить и сэкономить время, чем застрять на полдня."),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
const outPath = "docs/developer-guide.docx";
writeFileSync(outPath, buffer);
console.log(`Done: ${outPath}`);
