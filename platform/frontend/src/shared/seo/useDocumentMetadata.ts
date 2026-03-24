import { useEffect } from "react";

interface DocumentMetadataOptions {
  title: string;
  description: string;
  path: string;
  language?: string;
  keywords?: string;
  robots?: string;
  ogType?: "website" | "article";
  image?: string;
  publishedTime?: string;
  structuredData?: Record<string, unknown> | null;
}

const BASE_URL = "https://grummm.ru";
const DEFAULT_KEYWORDS = "grummm, modular platform, posts, projects, runtime demos, admin workspace, analytics, showcase";
const STRUCTURED_DATA_SCRIPT_ID = "seo-structured-data";

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  if (typeof document === "undefined") {
    return;
  }

  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function removeMeta(attribute: "name" | "property", key: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)?.remove();
}

function upsertLink(rel: string, href: string) {
  if (typeof document === "undefined") {
    return;
  }

  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
}

function upsertStructuredData(data: Record<string, unknown>) {
  if (typeof document === "undefined") {
    return;
  }

  let element = document.head.querySelector<HTMLScriptElement>(`script#${STRUCTURED_DATA_SCRIPT_ID}`);
  if (!element) {
    element = document.createElement("script");
    element.id = STRUCTURED_DATA_SCRIPT_ID;
    element.type = "application/ld+json";
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
}

function removeStructuredData() {
  if (typeof document === "undefined") {
    return;
  }

  document.head.querySelector<HTMLScriptElement>(`script#${STRUCTURED_DATA_SCRIPT_ID}`)?.remove();
}

export function useDocumentMetadata({
  title,
  description,
  path,
  language,
  keywords = DEFAULT_KEYWORDS,
  robots = "index,follow,max-image-preview:large",
  ogType = "website",
  image,
  publishedTime,
  structuredData
}: DocumentMetadataOptions) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const canonicalUrl = new URL(path, BASE_URL).toString();
    const resolvedImageUrl = image ? new URL(image, BASE_URL).toString() : undefined;
    document.title = title;

    if (language) {
      document.documentElement.lang = language;
    }

    upsertMeta("name", "description", description);
    upsertMeta("name", "keywords", keywords);
    upsertMeta("name", "robots", robots);
    upsertMeta("property", "og:type", ogType);
    upsertMeta("property", "og:site_name", "Grummm");
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertLink("canonical", canonicalUrl);

    if (resolvedImageUrl) {
      upsertMeta("property", "og:image", resolvedImageUrl);
      upsertMeta("name", "twitter:image", resolvedImageUrl);
    } else {
      removeMeta("property", "og:image");
      removeMeta("name", "twitter:image");
    }

    if (ogType === "article" && publishedTime) {
      upsertMeta("property", "article:published_time", publishedTime);
    } else {
      removeMeta("property", "article:published_time");
    }

    if (structuredData) {
      upsertStructuredData(structuredData);
    } else {
      removeStructuredData();
    }
  }, [description, image, keywords, language, ogType, path, publishedTime, robots, structuredData, title]);
}
