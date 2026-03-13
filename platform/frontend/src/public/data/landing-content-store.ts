import { useEffect, useState } from "react";
import { getCurrentLanguage, t } from "../../shared/i18n";
import type { LocalizedText } from "../types";

const STORAGE_KEY = "platform.landing.content.v2";
const UPDATE_EVENT = "platform:landing:updated";
const PUBLIC_API = "/api/public/content/landing";
const PRIVATE_API = "/api/app/content/landing";
const ACCESS_TOKEN_KEY = "platform.auth.accessToken";

export interface LandingContent {
  heroEyebrow: LocalizedText;
  heroTitle: LocalizedText;
  heroDescription: LocalizedText;
  aboutTitle: LocalizedText;
  aboutText: LocalizedText;
  portfolioTitle: LocalizedText;
  portfolioText: LocalizedText;
  aboutPhoto?: string;
}

const seedLandingContent: LandingContent = {
  heroEyebrow: {
    ru: "GRUMMM PLATFORM",
    en: "GRUMMM PLATFORM"
  },
  heroTitle: {
    ru: "Платформа, где проекты превращаются в живые демонстрации",
    en: "A platform where projects become live demonstrations"
  },
  heroDescription: {
    ru: "Grummm.ru — это персональная витрина с публичным портфолио и приватной админ-зоной, где я управляю проектами, шаблонами и контентом",
    en: "Grummm.ru is a personal showcase with a public portfolio and private admin area where I manage projects, templates, and content"
  },
  aboutTitle: {
    ru: "О платформе",
    en: "About the platform"
  },
  aboutText: {
    ru: "Я создаю прикладные web-проекты: от идеи и интерфейса до backend-логики и деплоя. Здесь виден мой подход к архитектуре, безопасности и развитию продукта",
    en: "I build practical web products end-to-end: from idea and interface to backend logic and deployment. This page shows my approach to architecture, security, and product thinking"
  },
  portfolioTitle: {
    ru: "Портфолио",
    en: "Portfolio"
  },
  portfolioText: {
    ru: "В портфолио собраны проекты с разными шаблонами: static, JavaScript, C#, Python. Каждый можно открыть, изучить и оценить в работе",
    en: "The portfolio includes projects with multiple templates: static, JavaScript, C#, and Python. Each one can be opened, explored, and reviewed in action"
  },
  aboutPhoto: undefined
};

function cloneSeed(): LandingContent {
  return {
    heroEyebrow: { ...seedLandingContent.heroEyebrow },
    heroTitle: { ...seedLandingContent.heroTitle },
    heroDescription: { ...seedLandingContent.heroDescription },
    aboutTitle: { ...seedLandingContent.aboutTitle },
    aboutText: { ...seedLandingContent.aboutText },
    portfolioTitle: { ...seedLandingContent.portfolioTitle },
    portfolioText: { ...seedLandingContent.portfolioText },
    aboutPhoto: seedLandingContent.aboutPhoto
  };
}

function writeLandingContent(next: LandingContent) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

function getAccessToken(): string | null {
  try {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    return token && token.trim().length > 0 ? token : null;
  } catch {
    return null;
  }
}

function ensureAccessToken(serverOnly: boolean): string | null {
  const token = getAccessToken();
  if (serverOnly && !token) {
    throw new Error(t("projectsStore.error.noAccessToken", getCurrentLanguage()));
  }
  return token;
}

export function readLandingContent(): LandingContent {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = cloneSeed();
      writeLandingContent(initial);
      return initial;
    }

    const parsed = JSON.parse(raw) as LandingContent;
    if (!parsed || typeof parsed !== "object") {
      const initial = cloneSeed();
      writeLandingContent(initial);
      return initial;
    }

    return {
      ...cloneSeed(),
      ...parsed
    };
  } catch {
    const initial = cloneSeed();
    writeLandingContent(initial);
    return initial;
  }
}

export function saveLandingContent(content: LandingContent): LandingContent {
  const normalized: LandingContent = {
    ...cloneSeed(),
    ...content
  };
  writeLandingContent(normalized);
  return normalized;
}

export interface LandingMutationOptions {
  serverOnly?: boolean;
}

export async function fetchLandingContentFromApi(): Promise<LandingContent | null> {
  try {
    const response = await fetch(PUBLIC_API, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as LandingContent;
    const normalized: LandingContent = {
      ...cloneSeed(),
      ...payload
    };
    writeLandingContent(normalized);
    return normalized;
  } catch {
    return null;
  }
}

// Landing content follows the same sync pattern as project posts: prefer server persistence, fall back to local cache when allowed.
export async function saveLandingContentToServer(
  content: LandingContent,
  options: LandingMutationOptions = {}
): Promise<LandingContent> {
  const normalized: LandingContent = {
    ...cloneSeed(),
    ...content
  };

  const token = ensureAccessToken(Boolean(options.serverOnly));

  if (!token) {
    if (options.serverOnly) {
      throw new Error(t("projectsStore.error.noServerUpdate", getCurrentLanguage()));
    }
    writeLandingContent(normalized);
    return normalized;
  }

  try {
    const response = await fetch(PRIVATE_API, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(normalized)
    });

    if (!response.ok) {
      if (options.serverOnly) {
        throw new Error(t("landingAdmin.error.sync", getCurrentLanguage()));
      }
      writeLandingContent(normalized);
      return normalized;
    }

    const payload = (await response.json()) as LandingContent;
    const synced: LandingContent = {
      ...cloneSeed(),
      ...payload
    };
    writeLandingContent(synced);
    return synced;
  } catch {
    if (options.serverOnly) {
      throw new Error(t("landingAdmin.error.sync", getCurrentLanguage()));
    }
    writeLandingContent(normalized);
    return normalized;
  }
}

export function useLandingContent(): LandingContent {
  const [content, setContent] = useState<LandingContent>(() =>
    typeof window === "undefined" ? cloneSeed() : readLandingContent()
  );

  useEffect(() => {
    const sync = () => setContent(readLandingContent());
    void fetchLandingContentFromApi().then((next) => {
      if (next) {
        setContent(next);
      }
    });
    window.addEventListener(UPDATE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(UPDATE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return content;
}
