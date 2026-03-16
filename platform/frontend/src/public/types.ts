export type Language = "en" | "ru";
export type ThemeMode = "light" | "dark";
export type PortfolioEntryKind = "post" | "project";
export type PortfolioContentBlockType = "paragraph" | "subheading" | "image";

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
}

export interface PortfolioProject {
  id: string;
  kind?: PortfolioEntryKind;
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  contentBlocks?: PortfolioContentBlock[];
  tags: string[];
  heroImage: ThemedAsset;
  screenshots: ThemedAsset[];
  videoUrl?: string;
  template?: TemplateType;
  frontendPath?: string;
  backendPath?: string;
}