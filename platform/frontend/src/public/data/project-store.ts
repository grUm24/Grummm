import { useEffect, useState } from "react";
import { seedProjects } from "./projects";
import type { PortfolioProject, TemplateType } from "../types";

const STORAGE_KEY = "platform.projects.posts.v1";
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

export interface ProjectUploadBundle {
  templateType: TemplateType;
  frontendFiles: File[];
  backendFiles: File[];
}

export interface AdminMutationOptions {
  serverOnly?: boolean;
}

function normalizeId(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
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
    screenshots: project.screenshots.map((s) => ({ ...s }))
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
    throw new Error("Нет access token. Повторно войдите в админ-панель.");
  }
  return token;
}

function parseApiList(payload: unknown): PortfolioProject[] {
  if (Array.isArray(payload)) {
    return payload as PortfolioProject[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    "items" in payload &&
    Array.isArray((payload as { items?: unknown[] }).items)
  ) {
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

async function tryMultipartUpsert(
  endpoint: string,
  token: string,
  upload?: ProjectUploadBundle
): Promise<{ ok: boolean; status: number } | null> {
  if (!upload || (upload.frontendFiles.length === 0 && upload.backendFiles.length === 0)) {
    return null;
  }

  const body = new FormData();
  body.append("templateType", upload.templateType);

  for (const file of upload.frontendFiles) {
    body.append("frontendFiles", file, file.webkitRelativePath || file.name);
  }

  for (const file of upload.backendFiles) {
    body.append("backendFiles", file, file.webkitRelativePath || file.name);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body
  });

  return { ok: response.ok, status: response.status };
}

function toServerMutationError(action: "создать" | "обновить", status: number | null): Error {
  if (status === 401) {
    return new Error("Сессия истекла (401). Войдите в админ-панель заново.");
  }

  if (status === 403) {
    return new Error("Недостаточно прав (403). Нужна учетная запись администратора.");
  }

  if (status === 413) {
    return new Error("Слишком большой размер запроса (413). Уменьшите медиа-файлы (лучше WebP/JPEG) или проверьте лимиты nginx/backend.");
  }

  if (status === 400) {
    return new Error("Сервер отклонил шаблон (400). Для Static нужен index.html (или zip с index.html внутри dist). ");
  }

  return new Error(`Ошибка: не удалось ${action} проект на сервере.`);
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
    const response = await fetch(PUBLIC_API, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    const projects = parseApiList(payload);
    writeProjects(projects);
    return projects;
  } catch {
    // offline or API unavailable
  }

  return null;
}

export async function fetchProjectByIdFromApi(projectId: string): Promise<PortfolioProject | null> {
  const token = getAccessToken();

  if (token) {
    try {
      const privateResponse = await fetch(`${PRIVATE_API}/${projectId}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (privateResponse.ok) {
        const payload = (await privateResponse.json()) as unknown;
        const item = parseApiItem(payload);
        if (item) {
          const current = readProjects().filter((p) => p.id !== item.id);
          writeProjects([item, ...current]);
          return item;
        }
      }
    } catch {
      // continue with fallback
    }
  }

  try {
    const publicResponse = await fetch(`${PUBLIC_API}/${projectId}`, {
      headers: { Accept: "application/json" }
    });

    if (publicResponse.ok) {
      const payload = (await publicResponse.json()) as unknown;
      const item = parseApiItem(payload);
      if (item) {
        const current = readProjects().filter((p) => p.id !== item.id);
        writeProjects([item, ...current]);
        return item;
      }
    }
  } catch {
    // ignore and fallback to local cache
  }

  return readProjects().find((project) => project.id === projectId) ?? null;
}

export async function createProject(input: PortfolioProject, upload?: ProjectUploadBundle): Promise<PortfolioProject[]> {
  return createProjectWithOptions(input, upload, {});
}

export async function createProjectWithOptions(
  input: PortfolioProject,
  upload?: ProjectUploadBundle,
  options: AdminMutationOptions = {}
): Promise<PortfolioProject[]> {
  const current = readProjects();
  const baseId = normalizeId(input.id || input.title.en || input.title.ru);
  let uniqueId = baseId;
  let idx = 1;
  while (current.some((p) => p.id === uniqueId)) {
    uniqueId = `${baseId}-${idx++}`;
  }

  const payload = toApiPayload({ ...input, id: uniqueId });
  const token = ensureAccessToken(Boolean(options.serverOnly));

  if (token) {
    try {
      let responseStatus: number | null = null;
      const response = await fetch(PRIVATE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      let responseOk = response.ok;
      responseStatus = response.status;

      if (responseOk && upload && (upload.frontendFiles.length > 0 || upload.backendFiles.length > 0) && upload.templateType !== "None") {
        const templateUploadResult = await tryMultipartUpsert(
          `${PRIVATE_API}/${payload.id}/upload-with-template`,
          token,
          upload
        );
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
          throw new Error("Сервер не вернул обновленный список проектов.");
        }
      } else if (options.serverOnly) {
        throw toServerMutationError("создать", responseStatus);
      }
    } catch (error) {
      if (options.serverOnly) {
        throw error instanceof Error ? error : new Error("Не удалось создать проект на сервере.");
      }
      // fallback to local
    }
  } else if (options.serverOnly) {
    throw new Error("Нет доступа к серверу для создания проекта.");
  }

  const next = [payload, ...current];
  writeProjects(next);
  return next;
}

export async function updateProject(
  projectId: string,
  patch: PortfolioProject,
  upload?: ProjectUploadBundle,
  options: AdminMutationOptions = {}
): Promise<PortfolioProject[]> {
  const current = readProjects();
  const payload = toApiPayload({ ...patch, id: projectId });
  const token = ensureAccessToken(Boolean(options.serverOnly));

  if (token) {
    try {
      let responseStatus: number | null = null;
      const response = await fetch(`${PRIVATE_API}/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      let responseOk = response.ok;
      responseStatus = response.status;

      if (responseOk && upload && (upload.frontendFiles.length > 0 || upload.backendFiles.length > 0) && upload.templateType !== "None") {
        const templateUploadResult = await tryMultipartUpsert(
          `${PRIVATE_API}/${projectId}/upload-with-template`,
          token,
          upload
        );
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
          throw new Error("Сервер не вернул обновленный список проектов.");
        }
      } else if (options.serverOnly) {
        throw toServerMutationError("обновить", responseStatus);
      }
    } catch (error) {
      if (options.serverOnly) {
        throw error instanceof Error ? error : new Error("Не удалось обновить проект на сервере.");
      }
      // fallback to local
    }
  } else if (options.serverOnly) {
    throw new Error("Нет доступа к серверу для обновления проекта.");
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
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const synced = await fetchProjectsFromApi();
        if (synced !== null) {
          return synced;
        }
        if (options.serverOnly) {
          throw new Error("Сервер не вернул обновленный список проектов.");
        }
      } else if (options.serverOnly) {
        throw new Error("Ошибка удаления проекта на сервере.");
      }
    } catch {
      if (options.serverOnly) {
        throw new Error("Не удалось удалить проект на сервере.");
      }
      // fallback to local
    }
  } else if (options.serverOnly) {
    throw new Error("Нет доступа к серверу для удаления проекта.");
  }

  const next = current.filter((project) => project.id !== projectId);
  writeProjects(next);
  return next;
}

export function useProjectPosts(): PortfolioProject[] {
  const [projects, setProjects] = useState<PortfolioProject[]>(() =>
    typeof window === "undefined" ? seedProjects : readProjects()
  );

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
