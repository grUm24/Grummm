import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useDropzone, type DropEvent } from "react-dropzone";
import { useSearchParams } from "react-router-dom";
import {
  createProjectWithOptions,
  updateProject,
  useProjectPosts,
  type ProjectUploadBundle
} from "../../public/data/project-store";
import type { PortfolioProject, TemplateType } from "../../public/types";

interface DraftProject {
  id: string;
  titleEn: string;
  titleRu: string;
  summaryEn: string;
  summaryRu: string;
  descriptionEn: string;
  descriptionRu: string;
  tags: string;
  heroLight: string;
  heroDark: string;
  screenshots: string[];
  includeVideo: boolean;
  videoUrl: string;
  templateType: TemplateType;
  frontendFiles: File[];
  backendFiles: File[];
}

const MAX_IMAGE_FILE_BYTES = 100 * 1024 * 1024;


const TEMPLATE_OPTIONS: Array<{ value: TemplateType; label: string }> = [
  { value: "None", label: "Без шаблона" },
  { value: "Static", label: "Статический" },
  { value: "CSharp", label: "C#" },
  { value: "Python", label: "Python" },
  { value: "JavaScript", label: "JavaScript" }
];

const TEMPLATE_INSTRUCTIONS: Record<Exclude<TemplateType, "None">, { frontend: string; backend: string }> = {
  Static: {
    frontend: "Загрузите dist-папку или .zip архив (обязательно index.html и assets; вложенная папка dist в архиве поддерживается).",
    backend: "Не требуется. Для статического шаблона backend-файлы запрещены."
  },
  CSharp: {
    frontend: "Перетащите сюда frontend-сборку (обычно dist для клиентской части).",
    backend: "Загрузите собранные DLL + .deps.json (и .runtimeconfig.json при необходимости)."
  },
  Python: {
    frontend: "Перетащите сюда frontend-сборку (если есть клиентская часть).",
    backend: "Загрузите Python-файлы сервиса: app.py, requirements.txt и остальные .py."
  },
  JavaScript: {
    frontend: "Перетащите сюда frontend-сборку (dist/index.html + assets).",
    backend: "Загрузите backend-файлы Node.js, включая package.json."
  }
};

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

function emptyDraft(): DraftProject {
  return {
    id: "",
    titleEn: "",
    titleRu: "",
    summaryEn: "",
    summaryRu: "",
    descriptionEn: "",
    descriptionRu: "",
    tags: "",
    heroLight: "",
    heroDark: "",
    screenshots: [],
    includeVideo: false,
    videoUrl: "",
    templateType: "None",
    frontendFiles: [],
    backendFiles: []
  };
}

function isImageTooLarge(file: File): boolean {
  return file.type.startsWith("image/") && file.size > MAX_IMAGE_FILE_BYTES;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.readAsDataURL(file);
  });
}

async function imageFileToOptimizedDataUrl(file: File): Promise<string> {
  const source = await fileToDataUrl(file);

  if (!file.type.startsWith("image/")) {
    return source;
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Не удалось обработать изображение."));
    img.src = source;
  });

  const maxWidth = 1600;
  const maxHeight = 1600;
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return source;
  }

  ctx.drawImage(image, 0, 0, width, height);
  const optimized = canvas.toDataURL("image/webp", 0.78);
  return optimized.length < source.length ? optimized : source;
}

function readFileEntry(entry: {
  file: (success: (file: File) => void, error?: (error: DOMException) => void) => void;
}): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

function readDirectoryEntries(reader: {
  readEntries: (success: (entries: unknown[]) => void, error?: (error: DOMException) => void) => void;
}): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    reader.readEntries(resolve, reject);
  });
}

async function flattenEntry(entry: unknown): Promise<File[]> {
  const item = entry as { isFile?: boolean; isDirectory?: boolean; file?: unknown; createReader?: () => unknown };

  if (item.isFile && typeof item.file === "function") {
    return [await readFileEntry(item as { file: (success: (file: File) => void, error?: (error: DOMException) => void) => void })];
  }

  if (!item.isDirectory || typeof item.createReader !== "function") {
    return [];
  }

  const reader = item.createReader() as {
    readEntries: (success: (entries: unknown[]) => void, error?: (error: DOMException) => void) => void;
  };
  const result: File[] = [];

  while (true) {
    const chunk = await readDirectoryEntries(reader);
    if (chunk.length === 0) {
      break;
    }

    const nested = await Promise.all(chunk.map(flattenEntry));
    nested.forEach((files) => result.push(...files));
  }

  return result;
}

async function getFilesRecursively(event: DropEvent): Promise<File[]> {
  const dragEvent = event as DragEvent;
  const items = Array.from(dragEvent.dataTransfer?.items ?? []);
  const entries = items
    .map((item) =>
      (item as DataTransferItem & { webkitGetAsEntry?: () => unknown }).webkitGetAsEntry?.() ?? null
    )
    .filter(Boolean);

  if (entries.length > 0) {
    const nested = await Promise.all(entries.map(flattenEntry));
    return nested.flat();
  }

  const fallbackFiles = Array.from(dragEvent.dataTransfer?.files ?? []);
  if (fallbackFiles.length > 0) {
    return fallbackFiles;
  }

  const maybeInput = event as Event;
  const target = maybeInput.target as HTMLInputElement | null;
  return Array.from(target?.files ?? []);
}

function toDraft(project: PortfolioProject): DraftProject {
  return {
    id: project.id,
    titleEn: project.title.en,
    titleRu: project.title.ru,
    summaryEn: project.summary.en,
    summaryRu: project.summary.ru,
    descriptionEn: project.description.en,
    descriptionRu: project.description.ru,
    tags: project.tags.join(", "),
    heroLight: project.heroImage.light,
    heroDark: project.heroImage.dark,
    screenshots: project.screenshots.map((s) => s.light),
    includeVideo: Boolean(project.videoUrl),
    videoUrl: project.videoUrl ?? "",
    templateType: project.template ?? "None",
    frontendFiles: [],
    backendFiles: []
  };
}

function fromDraft(draft: DraftProject): PortfolioProject {
  const tags = draft.tags
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const fallbackCover =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'><rect width='800' height='450' fill='#0f7b95'/><text x='40' y='90' font-size='48' fill='white'>Project Cover</text></svg>"
    );

  const coverLight = draft.heroLight || fallbackCover;
  const coverDark = draft.heroDark || coverLight;

  return {
    id: draft.id,
    title: {
      en: draft.titleEn || "Untitled",
      ru: draft.titleRu || draft.titleEn || "Без названия"
    },
    summary: {
      en: draft.summaryEn || "No summary yet.",
      ru: draft.summaryRu || draft.summaryEn || "Нет краткого описания."
    },
    description: {
      en: draft.descriptionEn || "No description yet.",
      ru: draft.descriptionRu || draft.descriptionEn || "Нет подробного описания."
    },
    tags,
    heroImage: {
      light: coverLight,
      dark: coverDark
    },
    screenshots: draft.screenshots.length
      ? draft.screenshots.map((image) => ({ light: image, dark: image }))
      : [{ light: coverLight, dark: coverDark }],
    videoUrl: draft.includeVideo ? draft.videoUrl || undefined : undefined,
    template: draft.templateType,
    frontendPath: DEFAULT_FRONTEND_PATH[draft.templateType],
    backendPath: DEFAULT_BACKEND_PATH[draft.templateType]
  };
}

interface TemplateDropzoneProps {
  title: string;
  hint: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
}

function TemplateDropzone({ title, hint, files, onFilesChange }: TemplateDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      if (accepted.length === 0) {
        return;
      }

      const merged = [...files, ...accepted];
      const unique = new Map<string, File>();
      merged.forEach((file) => unique.set(`${file.webkitRelativePath || file.name}:${file.size}`, file));
      onFilesChange(Array.from(unique.values()));
    },
    multiple: true,
    getFilesFromEvent: getFilesRecursively
  });

  return (
    <section className="admin-dropzone-wrap">
      <strong>{title}</strong>
      <p className="admin-muted">{hint}</p>
      <div className={`admin-dropzone ${isDragActive ? "is-active" : ""}`} {...getRootProps()}>
        <input {...getInputProps()} />
        <p>{isDragActive ? "Отпустите, чтобы загрузить файлы" : "Перетащите файлы/папку или нажмите для выбора"}</p>
      </div>
      <p className="admin-muted">Выбрано файлов: {files.length}</p>
      {files.length > 0 ? (
        <ul className="admin-file-list">
          {files.slice(0, 6).map((file) => (
            <li key={`${file.webkitRelativePath || file.name}:${file.size}`}>{file.webkitRelativePath || file.name}</li>
          ))}
          {files.length > 6 ? <li>...и еще {files.length - 6}</li> : null}
        </ul>
      ) : null}
      {files.length > 0 ? (
        <button type="button" onClick={() => onFilesChange([])}>
          Очистить файлы
        </button>
      ) : null}
    </section>
  );
}

interface AdminProjectsWorkspaceProps {
  mode?: "projects" | "posts";
}

export function AdminProjectsWorkspace({ mode = "projects" }: AdminProjectsWorkspaceProps) {
  const isPostsMode = mode === "posts";
  const projects = useProjectPosts();
  const [searchParams, setSearchParams] = useSearchParams();
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftProject>(() => emptyDraft());
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string>("");

  const sorted = useMemo(
    () =>
      [...projects]
        .filter((project) => !isPostsMode || (project.template ?? "None") === "None")
        .sort((a, b) => a.title.en.localeCompare(b.title.en)),
    [projects, isPostsMode]
  );

  function startCreate() {
    if (searchParams.has("edit")) {
      const next = new URLSearchParams(searchParams);
      next.delete("edit");
      setSearchParams(next, { replace: true });
    }
    setEditingId(null);
    setDraft(emptyDraft());
  }

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) {
      return;
    }

    const match = sorted.find((project) => project.id === editId);
    if (!match || editingId === match.id) {
      return;
    }

    setEditingId(match.id);
    setDraft(toDraft(match));
  }, [searchParams, sorted, editingId]);

  async function handleSingleImage(event: ChangeEvent<HTMLInputElement>, field: "heroLight" | "heroDark") {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (isImageTooLarge(file)) {
      setServerError("Фото слишком большое. Максимум 100 МБ на один файл.");
      return;
    }

    const dataUrl = await imageFileToOptimizedDataUrl(file);
    setDraft((current) => ({ ...current, [field]: dataUrl }));
  }

  async function appendScreenshots(files: File[]) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      return;
    }

    const tooLarge = imageFiles.find(isImageTooLarge);
    if (tooLarge) {
      setServerError("Одно из фото превышает лимит 100 МБ. Уменьшите файл и повторите.");
      return;
    }

    const dataUrls = await Promise.all(imageFiles.map((file) => imageFileToOptimizedDataUrl(file)));
    setDraft((current) => ({ ...current, screenshots: [...current.screenshots, ...dataUrls] }));
  }

  async function handleScreenshots(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    await appendScreenshots(files);
    event.target.value = "";
  }

  function removeScreenshot(indexToDelete: number) {
    setDraft((current) => ({
      ...current,
      screenshots: current.screenshots.filter((_, index) => index !== indexToDelete)
    }));
  }

  async function handleVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setDraft((current) => ({ ...current, videoUrl: dataUrl }));
  }


  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setServerError("");

    const project = isPostsMode
      ? {
          ...fromDraft({ ...draft, templateType: "None", frontendFiles: [], backendFiles: [] }),
          template: "None" as TemplateType,
          frontendPath: undefined,
          backendPath: undefined
        }
      : fromDraft(draft);
    const upload: ProjectUploadBundle | undefined = isPostsMode
      ? undefined
      : {
          templateType: draft.templateType,
          frontendFiles: draft.frontendFiles,
          backendFiles: draft.backendFiles
        };

    try {
      if (editingId) {
        await updateProject(editingId, project, upload, { serverOnly: true });
      } else {
        await createProjectWithOptions(project, upload, { serverOnly: true });
      }

      setEditingId(null);
      setDraft(emptyDraft());
      if (searchParams.has("edit")) {
        const next = new URLSearchParams(searchParams);
        next.delete("edit");
        setSearchParams(next, { replace: true });
      }
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Ошибка синхронизации с сервером.");
    } finally {
      setBusy(false);
    }
  }

  const templateDetails = draft.templateType === "None" ? null : TEMPLATE_INSTRUCTIONS[draft.templateType];

  return (
    <section className="admin-projects">
      <article className="admin-projects__workspace">
        <header className="admin-projects__hero">
          <h1>{isPostsMode ? "Рабочее пространство постов" : "Рабочее пространство проектов"}</h1>
          <p>
            {isPostsMode
              ? "Создавайте и редактируйте посты без загрузки шаблонов frontend/backend."
              : "Управляйте публикациями и шаблонами: создавайте посты, загружайте сборки и открывайте результат в `/app/&lt;slug&gt;`."}
          </p>
          {serverError ? <p className="admin-error">{serverError}</p> : null}
        </header>

        <div className="admin-projects__workspace-grid">
          <section className="admin-card admin-projects__actions admin-projects__nav-panel">
            <h2>Действия</h2>
            <button type="button" onClick={startCreate}>{isPostsMode ? "Новый пост" : "Новый пост проекта"}</button>
            <p className="admin-muted">
              {isPostsMode
                ? "Нажмите кнопку, чтобы очистить форму и начать создание нового поста."
                : "Нажмите кнопку, чтобы очистить форму и начать создание нового проекта."}
            </p>
          </section>

          <article className="admin-card admin-projects__editor">
          <h2>{editingId ? "Редактирование поста" : "Создание поста"}</h2>
          <p className="admin-muted">
            {isPostsMode ? (
              <>
                Заполните тексты и медиа, затем нажмите «{editingId ? "Сохранить изменения" : "Создать пост"}».
                <br />В этом разделе шаблоны и runtime-загрузка отключены.
              </>
            ) : (
              <>
                Как загрузить проект:
                <br />1) выберите тип шаблона,
                <br />2) заполните тексты и медиа,
                <br />3) добавьте файлы frontend/backend,
                <br />4) нажмите «{editingId ? "Сохранить изменения" : "Создать пост"}».
                <br />После сохранения frontend доступен по `/app/&lt;slug&gt;/index.html`.
              </>
            )}
          </p>
          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              Slug (для нового поста можно оставить пустым)
              <input
                value={draft.id}
                onChange={(e) => setDraft((c) => ({ ...c, id: e.target.value }))}
                placeholder="finance-tracker"
              />
            </label>
            {!isPostsMode ? (
              <label>
                Тип шаблона
                <select
                  data-testid="template-type-select"
                  value={draft.templateType}
                  onChange={(e) => {
                    const nextTemplateType = e.target.value as TemplateType;
                    setDraft((c) => ({
                      ...c,
                      templateType: nextTemplateType,
                      backendFiles: nextTemplateType === "Static" ? [] : c.backendFiles
                    }));
                  }}
                >
                  {TEMPLATE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {!isPostsMode && templateDetails ? (
              <section className="admin-template-accordion" data-testid="template-instructions">
                <details open>
                  <summary>Инструкции по загрузке шаблона</summary>
                  <TemplateDropzone
                    title="Frontend пакет"
                    hint={templateDetails.frontend}
                    files={draft.frontendFiles}
                    onFilesChange={(files) => setDraft((current) => ({ ...current, frontendFiles: files }))}
                  />
                  {draft.templateType !== "Static" ? (
                    <TemplateDropzone
                      title="Backend пакет"
                      hint={templateDetails.backend}
                      files={draft.backendFiles}
                      onFilesChange={(files) => setDraft((current) => ({ ...current, backendFiles: files }))}
                    />
                  ) : null}
                </details>
              </section>
            ) : null}

            <label>
              Заголовок (EN)
              <input required value={draft.titleEn} onChange={(e) => setDraft((c) => ({ ...c, titleEn: e.target.value }))} />
            </label>
            <label>
              Заголовок (RU)
              <input value={draft.titleRu} onChange={(e) => setDraft((c) => ({ ...c, titleRu: e.target.value }))} />
            </label>
            <label>
              Краткое описание (EN)
              <textarea rows={2} value={draft.summaryEn} onChange={(e) => setDraft((c) => ({ ...c, summaryEn: e.target.value }))} />
            </label>
            <label>
              Краткое описание (RU)
              <textarea rows={2} value={draft.summaryRu} onChange={(e) => setDraft((c) => ({ ...c, summaryRu: e.target.value }))} />
            </label>
            <label>
              Полное описание (EN)
              <textarea rows={4} value={draft.descriptionEn} onChange={(e) => setDraft((c) => ({ ...c, descriptionEn: e.target.value }))} />
              <small className="admin-muted">Пустая строка = новый абзац.</small>
            </label>
            <label>
              Полное описание (RU)
              <textarea rows={4} value={draft.descriptionRu} onChange={(e) => setDraft((c) => ({ ...c, descriptionRu: e.target.value }))} />
              <small className="admin-muted">Пустая строка = новый абзац.</small>
            </label>
            <label>
              Теги (через запятую)
              <input
                value={draft.tags}
                onChange={(e) => setDraft((c) => ({ ...c, tags: e.target.value }))}
                placeholder="React, TypeScript, API"
              />
            </label>
            <label>
              Обложка (светлая тема)
              <input type="file" accept="image/*" onChange={(e) => void handleSingleImage(e, "heroLight")} />
            </label>
            <label>
              Обложка (темная тема)
              <input type="file" accept="image/*" onChange={(e) => void handleSingleImage(e, "heroDark")} />
            </label>
            <label>
              Скриншоты (можно несколько)
              <input
                ref={screenshotInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => void handleScreenshots(e)}
                hidden
              />
              <div className="admin-screenshot-grid">
                {draft.screenshots.map((image, index) => (
                  <div key={`${index}:${image.slice(0, 24)}`} className="admin-screenshot-tile">
                    <img src={image} alt={`Скриншот ${index + 1}`} />
                    <button
                      type="button"
                      className="admin-screenshot-add"
                      title="Добавить еще фото"
                      onClick={() => screenshotInputRef.current?.click()}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="admin-screenshot-remove"
                      title="Удалить фото"
                      onClick={() => removeScreenshot(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="admin-screenshot-tile admin-screenshot-tile--add"
                  onClick={() => screenshotInputRef.current?.click()}
                >
                  <span>+</span>
                  <small>Добавить фото</small>
                </button>
              </div>
            </label>
            <label>
              Видео
              <div className="admin-video-toggle">
                <button
                  type="button"
                  className={draft.includeVideo ? "is-active" : ""}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      includeVideo: !current.includeVideo,
                      videoUrl: current.includeVideo ? "" : current.videoUrl
                    }))
                  }
                >
                  {draft.includeVideo ? "Видео: включено" : "Видео: не добавлять"}
                </button>
              </div>
              {draft.includeVideo ? (
                <input type="file" accept="video/*" onChange={(e) => void handleVideo(e)} />
              ) : (
                <small className="admin-muted">Видео необязательно. Включите, если нужно прикрепить файл.</small>
              )}
            </label>
            <button type="submit" disabled={busy} data-testid="project-submit">
              {editingId ? "Сохранить изменения" : "Создать пост"}
            </button>
          </form>
          </article>
        </div>

      </article>
    </section>
  );
}
