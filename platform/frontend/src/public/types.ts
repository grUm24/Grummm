export type Language = "en" | "ru";
export type ThemeMode = "light" | "dark";

export interface LocalizedText {
  en: string;
  ru: string;
}

export interface ThemedAsset {
  light: string;
  dark: string;
}

export interface PortfolioProject {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  tags: string[];
  heroImage: ThemedAsset;
  screenshots: ThemedAsset[];
  videoUrl?: string;
}
