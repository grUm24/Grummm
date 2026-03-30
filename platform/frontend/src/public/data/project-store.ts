import { useEffect, useState } from "react";
import { getCurrentLanguage, t } from "../../shared/i18n";
import { getCurrentAccessToken } from "../../core/auth/auth-session";
import { seedProjects } from "./projects";
import type {
  LocalizedText,
  PortfolioContentBlock,
  PortfolioContentBlockType,
  PortfolioEntryKind,
  PortfolioProject,
  PortfolioVisibility,
  RelatedEntry,
  TemplateType,
  ThemedAsset,
  Topic
} from "../types";

const STORAGE_KEY = "platform.projects.posts.v2";
const UPDATE_EVENT = "platform:projects:updated";
const PUBLIC_API = "/api/public/projects";
const PRIVATE_API = "/api/app/projects";
const PRIVATE_CONTENT_API = "/api/app/content";
const SEED_KIND_BY_ID = new Map(seedProjects.map((project) => [project.id, project.kind]));
const SEED_VISIBILITY_BY_ID = new Map(seedProjects.map((project) => [project.id, project.visibility]));
const SEED_PUBLISHED_AT_BY_ID = new Map(
  seedProjects
    .filter((project) => typeof project.publishedAt === "string" && project.publishedAt.trim().length > 0)
    .map((project) => [project.id, project.publishedAt as string])
);

const DEFAULT_FRONTEND_PATH: Record<TemplateType, string | undefined> = {
  None: undefined,
  Static: "/templates/static",
  CSharp: "/templates/csharp",
  Python: "/templates/python",
  JavaScript: "/templates/js"
};

const DEFAULT_BACKEND_PATH: Record<TemplateType, string | undefined> = {
  None: undefined,
  Static: undefined,
  CSharp: "/services/csharp",
  Python: "/services/python",
  JavaScript: "/services/js"
};

const CYRILLIC_TO_LATIN: Record<string, string> = {
  "\u0430": "a", "\u0431": "b", "\u0432": "v", "\u0433": "g", "\u0434": "d", "\u0435": "e", "\u0451": "e", "\u0436": "zh", "\u0437": "z", "\u0438": "i", "\u0439": "y",
  "\u043a": "k", "\u043b": "l", "\u043c": "m", "\u043d": "n", "\u043e": "o", "\u043f": "p", "\u0440": "r", "\u0441": "s", "\u0442": "t", "\u0443": "u", "\u0444": "f",
  "\u0445": "h", "\u0446": "ts", "\u0447": "ch", "\u0448": "sh", "\u0449": "sch", "\u044a": "", "\u044b": "y", "\u044c": "", "\u044d": "e", "\u044e": "yu", "\u044f": "ya"
};

export interface ProjectUploadBundle {
  templateType: TemplateType;
  frontendFiles: File[];
  backendFiles: File[];
}

export interface AdminMutationOptions {
  serverOnly?: boolean;
}

function normalizeLocalizedText(value?: Partial<LocalizedText> | null): LocalizedText {
  return {
    en: typeof value?.en === "string" ? value.en : "",
    ru: typeof value?.ru === "string" ? value.ru : ""
  };
}

function normalizeThemedAsset(asset?: Partial<ThemedAsset> | null): ThemedAsset {
  return {
    light: typeof asset?.light === "string" ? asset.light : "",
    dark: typeof asset?.dark === "string" ? asset.dark : (typeof asset?.light === "string" ? asset.light : "")
  };
}

function normalizeContentBlockType(value: string | undefined): PortfolioContentBlockType {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "subheading") {
    return "subheading";
  }

  if (normalized === "image") {
    return "image";
  }

  if (normalized === "video") {
    return "video";
  }

  if (normalized === "numbered-list" || normalized === "numberedlist" || normalized === "ordered-list" || normalized === "orderedlist") {
    return "numberedList";
  }

  if (normalized === "callout" || normalized === "quote" || normalized === "pullquote") {
    return "callout";
  }

  return "paragraph";
}

function normalizeContentBlocks(blocks?: PortfolioContentBlock[] | null): PortfolioContentBlock[] {
  if (!Array.isArray(blocks)) {
    return [];
  }

  return blocks
    .map((block, index) => {
      const type = normalizeContentBlockType(block?.type as string | undefined);
      return {
        id: typeof block?.id === "string" && block.id.trim().length > 0 ? block.id.trim() : `block-${index + 1}`,
        type,
        content: type === "image" ? undefined : normalizeLocalizedText(block?.content),
        imageUrl: typeof block?.imageUrl === "string" ? block.imageUrl : undefined,
        videoUrl: typeof block?.videoUrl === "string" ? block.videoUrl : undefined,
        posterUrl: typeof block?.posterUrl === "string" ? block.posterUrl : undefined,
        pinEnabled: type === "video" ? Boolean(block?.pinEnabled) : undefined,
        scrollSpan: type === "video" && typeof block?.scrollSpan === "number" && Number.isFinite(block.scrollSpan)
          ? Math.min(320, Math.max(80, Math.round(block.scrollSpan)))
          : undefined
      };
    })
    .filter((block) => {
      if (block.type === "image") {
        return Boolean(block.imageUrl);
      }

      if (block.type === "video") {
        return Boolean(block.videoUrl);
      }

      return Boolean(block.content?.en?.trim() || block.content?.ru?.trim());
    });
}

function normalizePublishedAt(value?: string | null): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function normalizeExplicitVisibility(value?: string | null): PortfolioVisibility | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "public" || normalized === "private" || normalized === "demo") {
    return normalized;
  }

  return undefined;
}

export function getPortfolioKind(project: PortfolioProject): PortfolioEntryKind {
  if (project.kind === "post" || project.kind === "project") {
    return project.kind;
  }

  const template = project.template ?? "None";
  return template !== "None" || Boolean(project.frontendPath || project.backendPath) ? "project" : "post";
}

function normalizeVisibility(project: PortfolioProject, kind: PortfolioEntryKind, template: TemplateType): PortfolioVisibility {
  const explicit = normalizeExplicitVisibility(project.visibility) ?? SEED_VISIBILITY_BY_ID.get(project.id);

  if (kind === "post") {
    return "public";
  }

  if (explicit === "private") {
    return "private";
  }

  if (explicit === "demo") {
    return template === "Static" ? "demo" : "public";
  }

  if (explicit === "public") {
    return "public";
  }

  if (project.publicDemoEnabled && template === "Static") {
    return "demo";
  }

  return "public";
}

export function isPortfolioPost(project: PortfolioProject): boolean {
  return getPortfolioKind(project) === "post";
}

export function isPortfolioProject(project: PortfolioProject): boolean {
  return getPortfolioKind(project) === "project";
}

export function isPortfolioPubliclyVisible(project: PortfolioProject): boolean {
  if (getPortfolioKind(project) === "post") {
    return true;
  }

  return (normalizeExplicitVisibility(project.visibility) ?? "public") !== "private";
}

export function isPortfolioPublicDemoEnabled(project: PortfolioProject): boolean {
  if (getPortfolioKind(project) !== "project") {
    return false;
  }

  const template = project.template ?? "None";
  if (template !== "Static") {
    return false;
  }

  const visibility = normalizeExplicitVisibility(project.visibility);
  return visibility === "demo" || project.publicDemoEnabled === true;
}

export function getPublicEntryPath(project: PortfolioProject): string {
  return isPortfolioPost(project) ? `/posts/${project.id}` : `/projects/${project.id}`;
}

function normalizeProjectRecord(project: PortfolioProject): PortfolioProject {
  const seedKind = SEED_KIND_BY_ID.get(project.id);
  const kind = project.kind ?? seedKind ?? getPortfolioKind(project);
  const template = kind === "post" ? "None" : (project.template ?? "None");
  const visibility = normalizeVisibility(project, kind, template);
  const normalizedPublishedAt = normalizePublishedAt(project.publishedAt) ?? normalizePublishedAt(SEED_PUBLISHED_AT_BY_ID.get(project.id));
  const publishedAt = normalizedPublishedAt ?? new Date().toISOString();

  return {
    ...project,
    kind,
    visibility,
    title: normalizeLocalizedText(project.title),
    summary: normalizeLocalizedText(project.summary),
    description: normalizeLocalizedText(project.description),
    publishedAt,
    contentBlocks: normalizeContentBlocks(project.contentBlocks),
    tags: Array.isArray(project.tags) ? project.tags.filter(Boolean) : [],
    publicDemoEnabled: kind === "project" && visibility === "demo" && template === "Static",
    heroImage: normalizeThemedAsset(project.heroImage),
    screenshots: Array.isArray(project.screenshots) ? project.screenshots.map(normalizeThemedAsset) : [],
    template
  };
}

function normalizeProjectList(projects: PortfolioProject[]): PortfolioProject[] {
  return projects.map(normalizeProjectRecord);
}

function tr(key: string, params?: Record<string, string | number>): string {
  return t(key, getCurrentLanguage(), params);
}

function transliterate(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");
}

function normalizeId(raw: string): string {
  const slug = transliterate(raw)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || `post-${Date.now()}`;
}

function cloneSeed(): PortfolioProject[] {
  return seedProjects.map((project) =>
    normalizeProjectRecord({
      ...project,
      title: { ...project.title },
      summary: { ...project.summary },
      description: { ...project.description },
      publishedAt: project.publishedAt,
      contentBlocks: (project.contentBlocks ?? []).map((block) => ({
        ...block,
        content: block.content ? { ...block.content } : undefined
      })),
      tags: [...project.tags],
      heroImage: { ...project.heroImage },
      screenshots: project.screenshots.map((item) => ({ ...item }))
    })
  );
}

function writeProjects(next: PortfolioProject[]): void {
  const normalized = normalizeProjectList(next);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

function getAccessToken(): string | null {
  try {
    const token = getCurrentAccessToken();
    return token && token.trim().length > 0 ? token : null;
  } catch {
    return null;
  }
}

function ensureAccessToken(serverOnly: boolean): string | null {
  const token = getAccessToken();
  if (serverOnly && !token) {
    throw new Error(tr("projectsStore.error.noAccessToken"));
  }
  return token;
}

function parseApiList(payload: unknown): PortfolioProject[] {
  if (Array.isArray(payload)) {
    return normalizeProjectList(payload as PortfolioProject[]);
  }

  if (payload && typeof payload === "object" && "items" in payload && Array.isArray((payload as { items?: unknown[] }).items)) {
    return normalizeProjectList((payload as { items: PortfolioProject[] }).items);
  }

  return [];
}

function parseApiItem(payload: unknown): PortfolioProject | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  return normalizeProjectRecord(payload as PortfolioProject);
}

function toApiPayload(input: PortfolioProject): PortfolioProject {
  const kind = getPortfolioKind(input);
  const template = kind === "post" ? "None" : input.template ?? "None";
  const visibility = normalizeVisibility(input, kind, template);

  return {
    ...input,
    kind,
    visibility,
    title: normalizeLocalizedText(input.title),
    summary: normalizeLocalizedText(input.summary),
    description: normalizeLocalizedText(input.description),
    publishedAt: normalizePublishedAt(input.publishedAt),
    contentBlocks: normalizeContentBlocks(input.contentBlocks),
    publicDemoEnabled: kind === "project" && visibility === "demo" && template === "Static",
    heroImage: normalizeThemedAsset(input.heroImage),
    screenshots: kind === "post" ? [] : (input.screenshots ?? []).map(normalizeThemedAsset),
    template,
    videoUrl: kind === "post" ? undefined : input.videoUrl,
    frontendPath: kind === "post" ? undefined : (input.frontendPath ?? DEFAULT_FRONTEND_PATH[template]),
    backendPath: kind === "post" ? undefined : (input.backendPath ?? DEFAULT_BACKEND_PATH[template])
  };
}

function ensurePublishedAt(input: PortfolioProject, existing?: PortfolioProject): string | undefined {
  return normalizePublishedAt(input.publishedAt)
    ?? normalizePublishedAt(existing?.publishedAt)
    ?? new Date().toISOString();
}

async function tryMultipartUpsert(endpoint: string, token: string, upload?: ProjectUploadBundle): Promise<{ ok: boolean; status: number } | null> {
  if (!upload || (upload.frontendFiles.length === 0 && upload.backendFiles.length === 0)) {
    return null;
  }

  const body = new FormData();
  body.append("templateType", upload.templateType);
  upload.frontendFiles.forEach((file) => body.append("frontendFiles", file, file.webkitRelativePath || file.name));
  upload.backendFiles.forEach((file) => body.append("backendFiles", file, file.webkitRelativePath || file.name));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body
  });

  return { ok: response.ok, status: response.status };
}

function toServerMutationError(action: "create" | "update", status: number | null): Error {
  if (status === 401) {
    return new Error(tr("projectsStore.error.sessionExpired"));
  }
  if (status === 403) {
    return new Error(tr("projectsStore.error.forbidden"));
  }
  if (status === 413) {
    return new Error(tr("projectsStore.error.fileTooLarge"));
  }
  if (status === 400) {
    return new Error(tr("projectsStore.error.invalidTemplate"));
  }

  return new Error(action === "create" ? tr("projectsStore.error.createFailed") : tr("projectsStore.error.updateFailed"));
}

export async function uploadPostVideoFile(file: File): Promise<string> {
  const token = ensureAccessToken(true);
  if (!token) {
    throw new Error(tr("projectsStore.error.noAccessToken"));
  }

  const body = new FormData();
  body.append("file", file, file.name);

  const response = await fetch(`${PRIVATE_CONTENT_API}/media/video`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body
  });

  if (response.status === 401) {
    throw new Error(tr("projectsStore.error.sessionExpired"));
  }

  if (response.status === 403) {
    throw new Error(tr("projectsStore.error.forbidden"));
  }

  if (response.status === 413) {
    throw new Error(tr("projectsStore.error.fileTooLarge"));
  }

  if (!response.ok) {
    throw new Error("Video upload failed.");
  }

  const payload = await response.json() as { url?: unknown };
  if (typeof payload.url !== "string" || payload.url.trim().length === 0) {
    throw new Error("Video upload completed without a media URL.");
  }

  return payload.url;
}

export function readProjects(): PortfolioProject[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = cloneSeed();
      writeProjects(initial);
      return initial;
    }

    const parsed = JSON.parse(raw) as PortfolioProject[];
    if (!Array.isArray(parsed)) {
      const initial = cloneSeed();
      writeProjects(initial);
      return initial;
    }

    const normalized = normalizeProjectList(parsed);
    if (JSON.stringify(normalized) !== raw) {
      writeProjects(normalized);
    }

    return normalized;
  } catch {
    const initial = cloneSeed();
    writeProjects(initial);
    return initial;
  }
}

export async function fetchProjectsFromApi(): Promise<PortfolioProject[] | null> {
  try {
    const response = await fetch(PUBLIC_API, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      return null;
    }

    const projects = parseApiList((await response.json()) as unknown);
    writeProjects(projects);
    return projects;
  } catch {
    return null;
  }
}

export async function fetchProjectsFromPrivateApi(token: string): Promise<PortfolioProject[] | null> {
  try {
    const response = await fetch(PRIVATE_API, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      return null;
    }

    const projects = parseApiList((await response.json()) as unknown);
    writeProjects(projects);
    return projects;
  } catch {
    return null;
  }
}

async function fetchProjectsForCurrentSession(): Promise<PortfolioProject[] | null> {
  const token = getAccessToken();
  if (token) {
    const privateProjects = await fetchProjectsFromPrivateApi(token);
    if (privateProjects !== null) {
      return privateProjects;
    }
  }

  return fetchProjectsFromApi();
}

export async function fetchProjectByIdFromApi(projectId: string): Promise<PortfolioProject | null> {
  const token = getAccessToken();

  if (token) {
    try {
      const privateResponse = await fetch(`${PRIVATE_API}/${projectId}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
      });
      if (privateResponse.ok) {
        const item = parseApiItem((await privateResponse.json()) as unknown);
        if (item) {
          writeProjects([item, ...readProjects().filter((project) => project.id !== item.id)]);
          return item;
        }
      }
    } catch {
      // continue with public fallback
    }
  }

  try {
    const publicResponse = await fetch(`${PUBLIC_API}/${projectId}`, { headers: { Accept: "application/json" } });
    if (publicResponse.ok) {
      const item = parseApiItem((await publicResponse.json()) as unknown);
      if (item) {
        writeProjects([item, ...readProjects().filter((project) => project.id !== item.id)]);
        return item;
      }
    }
  } catch {
    // fallback to local cache
  }

  return readProjects().find((project) => project.id === projectId) ?? null;
}

export async function createProject(input: PortfolioProject, upload?: ProjectUploadBundle): Promise<PortfolioProject[]> {
  return createProjectWithOptions(input, upload, {});
}

export async function createProjectWithOptions(input: PortfolioProject, upload?: ProjectUploadBundle, options: AdminMutationOptions = {}): Promise<PortfolioProject[]> {
  const current = readProjects();
  const baseId = normalizeId(input.id || input.title.en || input.title.ru);
  let uniqueId = baseId;
  let index = 1;

  while (current.some((project) => project.id === uniqueId)) {
    uniqueId = `${baseId}-${index++}`;
  }

  const localRecord = normalizeProjectRecord({ ...input, id: uniqueId, publishedAt: ensurePublishedAt({ ...input, id: uniqueId }) });
  const payload = toApiPayload(localRecord);
  const token = ensureAccessToken(Boolean(options.serverOnly));

  if (token) {
    try {
      let responseStatus: number | null = null;
      const response = await fetch(PRIVATE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      let responseOk = response.ok;
      responseStatus = response.status;

      if (responseOk && upload && payload.kind === "project" && upload.templateType !== "None" && (upload.frontendFiles.length > 0 || upload.backendFiles.length > 0)) {
        const templateUploadResult = await tryMultipartUpsert(`${PRIVATE_API}/${payload.id}/upload-with-template`, token, upload);
        if (templateUploadResult) {
          responseOk = templateUploadResult.ok;
          responseStatus = templateUploadResult.status;
        }
      }

      if (responseOk) {
        const synced = await fetchProjectsForCurrentSession();
        if (synced !== null) {
          return synced;
        }
        if (options.serverOnly) {
          throw new Error(tr("projectsStore.error.serverNoList"));
        }
      } else if (options.serverOnly) {
        throw toServerMutationError("create", responseStatus);
      }
    } catch (error) {
      if (options.serverOnly) {
        throw error instanceof Error ? error : new Error(tr("projectsStore.error.createFailed"));
      }
    }
  } else if (options.serverOnly) {
    throw new Error(tr("projectsStore.error.noServerCreate"));
  }

  const next = [localRecord, ...current];
  writeProjects(next);
  return normalizeProjectList(next);
}

export async function updateProject(projectId: string, patch: PortfolioProject, upload?: ProjectUploadBundle, options: AdminMutationOptions = {}): Promise<PortfolioProject[]> {
  const current = readProjects();
  const existing = current.find((project) => project.id === projectId);
  const localRecord = normalizeProjectRecord({
    ...patch,
    id: projectId,
    publishedAt: ensurePublishedAt({ ...patch, id: projectId }, existing)
  });
  const payload = toApiPayload(localRecord);
  const token = ensureAccessToken(Boolean(options.serverOnly));

  if (token) {
    try {
      let responseStatus: number | null = null;
      const response = await fetch(`${PRIVATE_API}/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      let responseOk = response.ok;
      responseStatus = response.status;

      if (responseOk && upload && payload.kind === "project" && upload.templateType !== "None" && (upload.frontendFiles.length > 0 || upload.backendFiles.length > 0)) {
        const templateUploadResult = await tryMultipartUpsert(`${PRIVATE_API}/${projectId}/upload-with-template`, token, upload);
        if (templateUploadResult) {
          responseOk = templateUploadResult.ok;
          responseStatus = templateUploadResult.status;
        }
      }

      if (responseOk) {
        const synced = await fetchProjectsForCurrentSession();
        if (synced !== null) {
          return synced;
        }
        if (options.serverOnly) {
          throw new Error(tr("projectsStore.error.serverNoList"));
        }
      } else if (options.serverOnly) {
        throw toServerMutationError("update", responseStatus);
      }
    } catch (error) {
      if (options.serverOnly) {
        throw error instanceof Error ? error : new Error(tr("projectsStore.error.updateFailed"));
      }
    }
  } else if (options.serverOnly) {
    throw new Error(tr("projectsStore.error.noServerUpdate"));
  }

  const next = current.map((project) => (project.id === projectId ? localRecord : project));
  writeProjects(next);
  return normalizeProjectList(next);
}

export async function deleteProject(projectId: string, options: AdminMutationOptions = {}): Promise<PortfolioProject[]> {
  const current = readProjects();
  const token = ensureAccessToken(Boolean(options.serverOnly));

  if (token) {
    try {
      const response = await fetch(`${PRIVATE_API}/${projectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const synced = await fetchProjectsForCurrentSession();
        if (synced !== null) {
          return synced;
        }
        if (options.serverOnly) {
          throw new Error(tr("projectsStore.error.serverNoList"));
        }
      } else if (options.serverOnly) {
        throw new Error(tr("projectsStore.error.deleteServer"));
      }
    } catch {
      if (options.serverOnly) {
        throw new Error(tr("projectsStore.error.deleteFailed"));
      }
    }
  } else if (options.serverOnly) {
    throw new Error(tr("projectsStore.error.noServerDelete"));
  }

  const next = current.filter((project) => project.id !== projectId);
  writeProjects(next);
  return normalizeProjectList(next);
}

export function useProjectPosts(): PortfolioProject[] {
  const [projects, setProjects] = useState<PortfolioProject[]>(() => (typeof window === "undefined" ? seedProjects : readProjects()));

  useEffect(() => {
    function refresh() {
      setProjects(readProjects());
    }

    void fetchProjectsForCurrentSession().then((items) => {
      if (items) {
        setProjects(items);
      }
    });

    window.addEventListener(UPDATE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(UPDATE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return projects;
}

export function useProjectPost(projectId?: string): PortfolioProject | undefined {
  const projects = useProjectPosts();
  return projectId ? projects.find((project) => project.id === projectId) : undefined;
}

export function useShowcasePosts(): PortfolioProject[] {
  return useProjectPosts().filter((project) => isPortfolioPost(project) && isPortfolioPubliclyVisible(project));
}

export function useRuntimeProjects(): PortfolioProject[] {
  return useProjectPosts().filter((project) => isPortfolioProject(project) && isPortfolioPubliclyVisible(project));
}

// ── Topics API ──

const TOPICS_API = "/api/app/topics";

export async function fetchTopics(token: string): Promise<Topic[]> {
  const response = await fetch(TOPICS_API, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { items?: Topic[] };
  return payload.items ?? [];
}

export async function upsertTopic(topic: Topic, token: string): Promise<Topic> {
  const response = await fetch(TOPICS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id: topic.id, name: topic.name })
  });
  if (!response.ok) throw new Error("Failed to save topic");
  return (await response.json()) as Topic;
}

export async function deleteTopic(topicId: string, token: string): Promise<void> {
  const response = await fetch(`${TOPICS_API}/${topicId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok && response.status !== 404) throw new Error("Failed to delete topic");
}

// ── Project Relations API ──

export async function fetchProjectRelations(projectId: string, token: string): Promise<string[]> {
  const response = await fetch(`${PRIVATE_API}/${projectId}/relations`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { items?: string[] };
  return payload.items ?? [];
}

export async function setProjectRelations(projectId: string, targetIds: string[], token: string): Promise<string[]> {
  const response = await fetch(`${PRIVATE_API}/${projectId}/relations`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ targetIds })
  });
  if (!response.ok) throw new Error("Failed to save relations");
  const payload = (await response.json()) as { items?: string[] };
  return payload.items ?? [];
}

// ── Project Topics API ──

export async function fetchProjectTopics(projectId: string, token: string): Promise<string[]> {
  const response = await fetch(`${PRIVATE_API}/${projectId}/topics`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { items?: string[] };
  return payload.items ?? [];
}

export async function setProjectTopics(projectId: string, topicIds: string[], token: string): Promise<string[]> {
  const response = await fetch(`${PRIVATE_API}/${projectId}/topics`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ topicIds })
  });
  if (!response.ok) throw new Error("Failed to save topics");
  const payload = (await response.json()) as { items?: string[] };
  return payload.items ?? [];
}

// ── Public: Related entries ──

export async function fetchRelatedEntries(projectId: string): Promise<RelatedEntry[]> {
  const response = await fetch(`${PUBLIC_API}/${projectId}/related`, {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { items?: RelatedEntry[] };
  return payload.items ?? [];
}
