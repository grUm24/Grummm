export type Language = "en" | "ru";
export type ThemeMode = "light" | "dark";
export type PortfolioEntryKind = "post" | "project";
export type PortfolioContentBlockType = "paragraph" | "subheading" | "image" | "video" | "numberedList" | "callout" | "collage" | "typewriter";
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
  images?: string[];
  pinEnabled?: boolean;
  scrollSpan?: number;
}

export interface Topic {
  id: string;
  name: LocalizedText;
}

export interface RelatedEntry {
  id: string;
  kind: PortfolioEntryKind;
  title: LocalizedText;
  summary: LocalizedText;
  heroImage: ThemedAsset;
  sharedTopics: string[];
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
