import { useEffect, useState } from "react";
import { getCurrentLanguage, t } from "../../shared/i18n";
import { seedProjects } from "./projects";
import type { PortfolioProject, TemplateType } from "../types";

const STORAGE_KEY = "platform.projects.posts.v2";
const UPDATE_EVENT = "platform:projects:updated";
const PUBLIC_API = "/api/public/projects";
const PRIVATE_API = "/api/app/projects";
const ACCESS_TOKEN_KEY = "platform.auth.accessToken";

const DEFAULT_FRONTEND_PATH: Record<TemplateType, string | undefined> = {
  None: undefined,
  Static: "/templates/static",
  CSharp: "/templates/csharp",
  Python: "/templates/python",
  JavaScript: "/templates/js"
};

const DEFAULT_BACKEND_PATH: Record<TemplateType, string | undefined> = {
  None: undefined,
  Static: "/services/static",
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
  return seedProjects.map((project) => ({
    ...project,
    title: { ...project.title },
    summary: { ...project.summary },
    description: { ...project.description },
    tags: [...project.tags],
    heroImage: { ...project.heroImage },
    screenshots: project.screenshots.map((item) => ({ ...item }))
  }));
}

function writeProjects(next: PortfolioProject[]): void {
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
    throw new Error(tr("projectsStore.error.noAccessToken"));
  }
  return token;
}

function parseApiList(payload: unknown): PortfolioProject[] {
  if (Array.isArray(payload)) {
    return payload as PortfolioProject[];
  }

  if (payload && typeof payload === "object" && "items" in payload && Array.isArray((payload as { items?: unknown[] }).items)) {
    return (payload as { items: PortfolioProject[] }).items;
  }

  return [];
}

function parseApiItem(payload: unknown): PortfolioProject | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  return payload as PortfolioProject;
}

function toApiPayload(input: PortfolioProject): PortfolioProject {
  const template = input.template ?? "None";
  return {
    ...input,
    template,
    frontendPath: input.frontendPath ?? DEFAULT_FRONTEND_PATH[template],
    backendPath: input.backendPath ?? DEFAULT_BACKEND_PATH[template]
  };
}

// Template files are uploaded after the metadata mutation succeeds because the backend treats them as a separate flow.
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

    return parsed;
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

// Admin mutations are server-first, but can fall back to localStorage when the UI is used without a valid backend session.
export async function createProjectWithOptions(input: PortfolioProject, upload?: ProjectUploadBundle, options: AdminMutationOptions = {}): Promise<PortfolioProject[]> {
  const current = readProjects();
  const baseId = normalizeId(input.id || input.title.en || input.title.ru);
  let uniqueId = baseId;
  let index = 1;

  while (current.some((project) => project.id === uniqueId)) {
    uniqueId = `${baseId}-${index++}`;
  }

  const payload = toApiPayload({ ...input, id: uniqueId });
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

      if (responseOk && upload && upload.templateType !== "None" && (upload.frontendFiles.length > 0 || upload.backendFiles.length > 0)) {
        const templateUploadResult = await tryMultipartUpsert(`${PRIVATE_API}/${payload.id}/upload-with-template`, token, upload);
        if (templateUploadResult) {
          responseOk = templateUploadResult.ok;
          responseStatus = templateUploadResult.status;
        }
      }

      if (responseOk) {
        const synced = await fetchProjectsFromApi();
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

  const next = [payload, ...current];
  writeProjects(next);
  return next;
}

export async function updateProject(projectId: string, patch: PortfolioProject, upload?: ProjectUploadBundle, options: AdminMutationOptions = {}): Promise<PortfolioProject[]> {
  const current = readProjects();
  const payload = toApiPayload({ ...patch, id: projectId });
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

      if (responseOk && upload && upload.templateType !== "None" && (upload.frontendFiles.length > 0 || upload.backendFiles.length > 0)) {
        const templateUploadResult = await tryMultipartUpsert(`${PRIVATE_API}/${projectId}/upload-with-template`, token, upload);
        if (templateUploadResult) {
          responseOk = templateUploadResult.ok;
          responseStatus = templateUploadResult.status;
        }
      }

      if (responseOk) {
        const synced = await fetchProjectsFromApi();
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

  const next = current.map((project) => (project.id === projectId ? payload : project));
  writeProjects(next);
  return next;
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
        const synced = await fetchProjectsFromApi();
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
  return next;
}

export function useProjectPosts(): PortfolioProject[] {
  const [projects, setProjects] = useState<PortfolioProject[]>(() => (typeof window === "undefined" ? seedProjects : readProjects()));

  useEffect(() => {
    function refresh() {
      setProjects(readProjects());
    }

    void fetchProjectsFromApi().then((items) => {
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
