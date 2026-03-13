import { en } from "./en";
import { ru } from "./ru";
import type { Language } from "../../public/types";

export type TranslationParams = Record<string, string | number>;

const dictionaries = { en, ru } as const;

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name: string) => {
    const value = params[name];
    return value === undefined ? `{${name}}` : String(value);
  });
}

export function t(key: string, language: Language, params?: TranslationParams): string {
  const primary = dictionaries[language][key as keyof typeof dictionaries[typeof language]] as string | undefined;
  if (primary) {
    return interpolate(primary, params);
  }

  const fallback = dictionaries.en[key as keyof typeof dictionaries.en] as string | undefined;
  if (fallback) {
    return interpolate(fallback, params);
  }

  return key;
}
