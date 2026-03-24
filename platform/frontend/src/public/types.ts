export type Language = "en" | "ru";
export type ThemeMode = "light" | "dark";
export type PortfolioEntryKind = "post" | "project";
export type PortfolioContentBlockType = "paragraph" | "subheading" | "image" | "video" | "numberedList" | "callout";
export type PortfolioVisibility = "public" | "private" | "demo";

export interface LocalizedText {
  en: string;
  ru: string;
}

export interface ThemedAsset {
  light: string;
  dark: string;
}

export type TemplateType = "None" | "Static" | "CSharp" | "Python" | "JavaScript";

export interface PortfolioContentBlock {
  id: string;
  type: PortfolioContentBlockType;
  content?: LocalizedText;
  imageUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  pinEnabled?: boolean;
  scrollSpan?: number;
}

export interface PortfolioProject {
  id: string;
  kind?: PortfolioEntryKind;
  visibility?: PortfolioVisibility;
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  publishedAt?: string;
  contentBlocks?: PortfolioContentBlock[];
  tags: string[];
  publicDemoEnabled?: boolean;
  heroImage: ThemedAsset;
  screenshots: ThemedAsset[];
  videoUrl?: string;
  template?: TemplateType;
  frontendPath?: string;
  backendPath?: string;
}
