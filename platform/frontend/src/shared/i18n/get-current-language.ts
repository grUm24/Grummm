import type { Language } from "../../public/types";

export function getCurrentLanguage(): Language {
  try {
    const stored = window.localStorage.getItem("platform.ui.language");
    if (stored === "ru" || stored === "en") {
      return stored;
    }
  } catch {
    // ignore
  }

  const locale = (typeof navigator !== "undefined" ? navigator.language : "en").toLowerCase();
  return locale.startsWith("ru") ? "ru" : "en";
}
