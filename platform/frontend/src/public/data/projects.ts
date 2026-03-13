import type { PortfolioProject } from "../types";

function svgCard(label: string, start: string, end: string, accent: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='${start}' />
        <stop offset='100%' stop-color='${end}' />
      </linearGradient>
    </defs>
    <rect width='1280' height='720' fill='url(#g)'/>
    <circle cx='1120' cy='140' r='160' fill='${accent}' fill-opacity='0.22'/>
    <circle cx='180' cy='620' r='230' fill='${accent}' fill-opacity='0.18'/>
    <text x='70' y='120' font-family='Segoe UI, Arial, sans-serif' font-size='64' fill='white'>${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const seedProjects: PortfolioProject[] = [
  {
    id: "task-tracker",
    title: {
      en: "Task Tracker",
      ru: "Трекер задач"
    },
    summary: {
      en: "Owner-scoped task board with secure private routes.",
      ru: "Доска задач с owner-логикой и защищёнными приватными маршрутами."
    },
    description: {
      en: "Task Tracker is a production-oriented module with CQRS handlers, ownership checks, and audit-aware private API endpoints.",
      ru: "Task Tracker это production-ориентированный модуль с CQRS-обработчиками, проверкой владельца и audit-aware приватными API-эндпоинтами."
    },
    tags: ["React", ".NET", "CQRS", "Audit"],
    heroImage: {
      light: svgCard("Task Tracker", "#1795a8", "#3cbf8a", "#f4f1a7"),
      dark: svgCard("Task Tracker", "#0e2f48", "#0b5668", "#f59e0b")
    },
    screenshots: [
      {
        light: svgCard("Create Task", "#28a6b8", "#47ce9a", "#ffe08a"),
        dark: svgCard("Create Task", "#163145", "#0e6478", "#f59e0b")
      },
      {
        light: svgCard("Board View", "#58b8d1", "#75d4ad", "#fff2a4"),
        dark: svgCard("Board View", "#1d374d", "#216975", "#f2b56f")
      }
    ]
  },
  {
    id: "finance-tracker",
    title: {
      en: "Finance Tracker",
      ru: "Финансовый трекер"
    },
    summary: {
      en: "Budget, cashflow and KPI visualization for teams.",
      ru: "Бюджет, кэшфлоу и визуализация KPI для команд."
    },
    description: {
      en: "Finance Tracker focuses on monthly planning, variance alerts and compact decision dashboards for operational teams.",
      ru: "Finance Tracker фокусируется на помесячном планировании, алертах по отклонениям и компактных дашбордах для операционных команд."
    },
    tags: ["Analytics", "PostgreSQL", "Dashboard"],
    heroImage: {
      light: svgCard("Finance Tracker", "#eb8d45", "#f2bc61", "#5ca4df"),
      dark: svgCard("Finance Tracker", "#3f2b24", "#6b3f28", "#2d6ea2")
    },
    screenshots: [
      {
        light: svgCard("KPI Tiles", "#ec9952", "#f5c86e", "#5ca4df"),
        dark: svgCard("KPI Tiles", "#4f3026", "#71482f", "#3e80b5")
      },
      {
        light: svgCard("Cashflow", "#f6a85c", "#f8d084", "#69a9df"),
        dark: svgCard("Cashflow", "#543626", "#764d30", "#3f88bb")
      }
    ]
  },
  {
    id: "chat-module",
    title: {
      en: "Chat Module",
      ru: "Чат-модуль"
    },
    summary: {
      en: "Fast internal messaging with moderation controls.",
      ru: "Быстрые внутренние сообщения с модерацией."
    },
    description: {
      en: "Chat Module provides low-friction team communication with role-based moderation and a lightweight event stream.",
      ru: "Chat Module даёт командное общение с role-based модерацией и лёгким событийным потоком."
    },
    tags: ["Realtime", "Moderation", "UX"],
    heroImage: {
      light: svgCard("Chat Module", "#4d92f2", "#57c8e8", "#ffd283"),
      dark: svgCard("Chat Module", "#1e375f", "#18586a", "#f59e0b")
    },
    screenshots: [
      {
        light: svgCard("Rooms", "#519cf2", "#63cbe9", "#ffd283"),
        dark: svgCard("Rooms", "#213b65", "#1b5f71", "#f59e0b")
      },
      {
        light: svgCard("Moderation", "#57a7f4", "#73d1ed", "#ffd89b"),
        dark: svgCard("Moderation", "#24416b", "#21697a", "#f7ac35")
      }
    ]
  }
];
