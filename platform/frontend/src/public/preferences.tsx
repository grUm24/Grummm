import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { Language, ThemeMode } from "./types";

const THEME_KEY = "platform.ui.theme";
const LANGUAGE_KEY = "platform.ui.language";

interface PreferencesContextValue {
  theme: ThemeMode;
  language: Language;
  setTheme: (value: ThemeMode) => void;
  setLanguage: (value: Language) => void;
  toggleTheme: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

function safeTheme(): ThemeMode {
  const isDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return isDark ? "dark" : "light";
}

function readTheme(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // no-op
  }
  return safeTheme();
}

function readLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_KEY);
    if (stored === "en" || stored === "ru") {
      return stored;
    }
  } catch {
    // no-op
  }
  const base = window.navigator.language.toLowerCase();
  return base.startsWith("ru") ? "ru" : "en";
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme());
  const [language, setLanguage] = useState<Language>(() => readLanguage());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      theme,
      language,
      setTheme,
      setLanguage,
      toggleTheme: () => setTheme((prev) => (prev === "dark" ? "light" : "dark"))
    }),
    [theme, language]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used inside PreferencesProvider.");
  }
  return context;
}

