import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useDropzone, type DropEvent } from "react-dropzone";
import { useSearchParams } from "react-router-dom";
import {
  createProjectWithOptions,
  deleteProject,
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
  { value: "None", label: "No template" },
  { value: "Static", label: "Static" },
  { value: "CSharp", label: "C#" },
  { value: "Python", label: "Python" },
  { value: "JavaScript", label: "JavaScript" }
];

const TEMPLATE_INSTRUCTIONS: Record<Exclude<TemplateType, "None">, { frontend: string; backend: string }> = {
  Static: {
    frontend: "Upload dist folder or zip archive with static build. It must include index.html and assets.",
    backend: "Backend is not required for Static template and will be ignored."
  },
  CSharp: {
    frontend: "Upload frontend build if project contains client part.",
    backend: "Upload compiled DLLs, .deps.json and optionally .runtimeconfig.json."
  },
  Python: {
    frontend: "Upload frontend build if project contains client part.",
    backend: "Upload Python service files: app.py, requirements.txt and dependencies."
  },
  JavaScript: {
    frontend: "Upload dist/index.html and assets for frontend layer.",
    backend: "Upload Node.js backend with package.json and related files."
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
    reader.onerror = () => reject(new Error("Failed to read file."));
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
    img.onerror = () => reject(new Error("Failed to process image."));
    img.src = source;
  });

  const ratio = Math.min(1600 / image.width, 1600 / image.height, 1);
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

function readFileEntry(entry: { file: (success: (file: File) => void, error?: (error: DOMException) => void) => void }): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

function readDirectoryEntries(reader: { readEntries: (success: (entries: unknown[]) => void, error?: (error: DOMException) => void) => void }): Promise<unknown[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

async function flattenEntry(entry: unknown): Promise<File[]> {
  const item = entry as { isFile?: boolean; isDirectory?: boolean; file?: unknown; createReader?: () => unknown };

  if (item.isFile && typeof item.file === "function") {
    return [await readFileEntry(item as { file: (success: (file: File) => void, error?: (error: DOMException) => void) => void })];
  }

  if (!item.isDirectory || typeof item.createReader !== "function") {
    return [];
  }

  const reader = item.createReader() as { readEntries: (success: (entries: unknown[]) => void, error?: (error: DOMException) => void) => void };
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
  const entries = Array.from(dragEvent.dataTransfer?.items ?? [])
    .map((item) => (item as DataTransferItem & { webkitGetAsEntry?: () => unknown }).webkitGetAsEntry?.() ?? null)
    .filter(Boolean);

  if (entries.length > 0) {
    const nested = await Promise.all(entries.map(flattenEntry));
    return nested.flat();
  }

  const fallbackFiles = Array.from(dragEvent.dataTransfer?.files ?? []);
  if (fallbackFiles.length > 0) {
    return fallbackFiles;
  }

  const target = (event as Event).target as HTMLInputElement | null;
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
    screenshots: project.screenshots.map((item) => item.light),
    includeVideo: Boolean(project.videoUrl),
    videoUrl: project.videoUrl ?? "",
    templateType: project.template ?? "None",
    frontendFiles: [],
    backendFiles: []
  };
}

function fromDraft(draft: DraftProject): PortfolioProject {
  const tags = draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  const fallbackCover = "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'><rect width='800' height='450' fill='#168ba6'/><text x='40' y='90' font-size='48' fill='white'>Project Cover</text></svg>");
  const coverLight = draft.heroLight || fallbackCover;
  const coverDark = draft.heroDark || coverLight;

  return {
    id: draft.id,
    title: { en: draft.titleEn || "Untitled", ru: draft.titleRu || draft.titleEn || "No title" },
    summary: { en: draft.summaryEn || "No summary yet.", ru: draft.summaryRu || draft.summaryEn || "No summary yet." },
    description: { en: draft.descriptionEn || "No description yet.", ru: draft.descriptionRu || draft.descriptionEn || "No description yet." },
    tags,
    heroImage: { light: coverLight, dark: coverDark },
    screenshots: draft.screenshots.length > 0 ? draft.screenshots.map((image) => ({ light: image, dark: image })) : [{ light: coverLight, dark: coverDark }],
    videoUrl: draft.includeVideo ? draft.videoUrl || undefined : undefined,
    template: draft.templateType,
    frontendPath: DEFAULT_FRONTEND_PATH[draft.templateType],
    backendPath: DEFAULT_BACKEND_PATH[draft.templateType]
  };
}

function templateBadge(template: TemplateType | undefined): string {
  const current = template ?? "None";
  return current === "None" ? "Post" : current === "CSharp" ? "C#" : current;
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
        <p>{isDragActive ? "Drop files to upload" : "Drag files/folder here or click to select"}</p>
      </div>
      <p className="admin-muted">Selected files: {files.length}</p>
      {files.length > 0 ? (
        <>
          <ul className="admin-file-list">
            {files.slice(0, 6).map((file) => <li key={`${file.webkitRelativePath || file.name}:${file.size}`}>{file.webkitRelativePath || file.name}</li>)}
            {files.length > 6 ? <li>And {files.length - 6} more</li> : null}
          </ul>
          <button type="button" onClick={() => onFilesChange([])}>Clear files</button>
        </>
      ) : null}
    </section>
  );
}

interface AdminProjectsWorkspaceProps {
  mode?: "projects" | "posts";
}

export function AdminProjectsWorkspace({ mode = "projects" }: AdminProjectsWorkspaceProps) {
  const isPostsMode = mode === "posts";
  const labels = isPostsMode
    ? {
        eyebrow: "Content workspace",
        title: "Posts editor",
        description: "Create showcase publications without runtime templates: text, images, video, and tags in one form.",
        listTitle: "Published posts",
        listHint: "Select an existing post to edit or start a new one.",
        createLabel: "New post",
        editTitle: "Edit post",
        createTitle: "Create post",
        editorHint: "After save, the post appears in the public showcase and detail page.",
        submitCreate: "Create post",
        submitEdit: "Save changes",
        empty: "No posts yet.",
        deletePrompt: "Delete this post permanently?"
      }
    : {
        eyebrow: "Runtime workspace",
        title: "Projects editor",
        description: "Build runtime-ready projects: content, media, bundles and server publishing in one place.",
        listTitle: "Runtime projects",
        listHint: "Open a project card to edit content or upload a new build.",
        createLabel: "New project",
        editTitle: "Edit project",
        createTitle: "Create project",
        editorHint: "Pick template type, fill content, and upload frontend/backend bundles if needed.",
        submitCreate: "Create project",
        submitEdit: "Save changes",
        empty: "No template projects yet.",
        deletePrompt: "Delete this project with runtime data permanently?"
      };

  const projects = useProjectPosts();
  const [searchParams, setSearchParams] = useSearchParams();
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftProject>(() => emptyDraft());
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  const items = useMemo(
    () =>
      [...projects]
        .filter((project) => isPostsMode ? (project.template ?? "None") === "None" : (project.template ?? "None") !== "None")
        .sort((a, b) => a.title.en.localeCompare(b.title.en)),
    [projects, isPostsMode]
  );

  function clearEditQuery() {
    if (!searchParams.has("edit")) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    setSearchParams(next, { replace: true });
  }

  function startCreate() {
    clearEditQuery();
    setEditingId(null);
    setDraft(emptyDraft());
    setServerError("");
  }

  function startEdit(projectId: string) {
    const next = new URLSearchParams(searchParams);
    next.set("edit", projectId);
    setSearchParams(next, { replace: true });
  }

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) {
      return;
    }

    const match = items.find((project) => project.id === editId);
    if (!match) {
      clearEditQuery();
      return;
    }

    if (editingId === match.id) {
      return;
    }

    setEditingId(match.id);
    setDraft(toDraft(match));
    setServerError("");
  }, [searchParams, items, editingId]);

  async function handleSingleImage(event: ChangeEvent<HTMLInputElement>, field: "heroLight" | "heroDark") {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (isImageTooLarge(file)) {
      setServerError("Image is too large. Limit is 100MB per file.");
      return;
    }

    const dataUrl = await imageFileToOptimizedDataUrl(file);
    setDraft((current) => ({ ...current, [field]: dataUrl }));
    event.target.value = "";
  }

  async function appendScreenshots(files: File[]) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      return;
    }
    if (imageFiles.some(isImageTooLarge)) {
      setServerError("One of images exceeds 100MB.");
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

  async function handleVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setDraft((current) => ({ ...current, includeVideo: true, videoUrl: dataUrl }));
    event.target.value = "";
  }

  function removeScreenshot(indexToDelete: number) {
    setDraft((current) => ({ ...current, screenshots: current.screenshots.filter((_, index) => index !== indexToDelete) }));
  }

  async function handleDelete(projectId: string) {
    if (!window.confirm(labels.deletePrompt)) {
      return;
    }

    setBusy(true);
    setServerError("");
    try {
      await deleteProject(projectId, { serverOnly: true });
      if (editingId === projectId) {
        startCreate();
      }
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Failed to delete item.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setServerError("");

    const project = isPostsMode
      ? { ...fromDraft({ ...draft, templateType: "None", frontendFiles: [], backendFiles: [] }), template: "None" as TemplateType, frontendPath: undefined, backendPath: undefined }
      : fromDraft(draft);

    const upload: ProjectUploadBundle | undefined = isPostsMode
      ? undefined
      : { templateType: draft.templateType, frontendFiles: draft.frontendFiles, backendFiles: draft.backendFiles };

    try {
      if (editingId) {
        await updateProject(editingId, project, upload, { serverOnly: true });
      } else {
        await createProjectWithOptions(project, upload, { serverOnly: true });
      }
      startCreate();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Failed to synchronize with server.");
    } finally {
      setBusy(false);
    }
  }

  const templateDetails = draft.templateType === "None" ? null : TEMPLATE_INSTRUCTIONS[draft.templateType];

  return (
    <section className="admin-projects">
      <article className="admin-projects__workspace">
        <header className="admin-projects__hero">
          <p className="private-layout__eyebrow">{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p>{labels.description}</p>
          {serverError ? <p className="admin-error">{serverError}</p> : null}
        </header>

        <div className="admin-projects__workspace-grid">
          <aside className="admin-card admin-projects__sidebar">
            <div className="admin-panel__header">
              <div>
                <h2>{labels.listTitle}</h2>
                <p className="admin-muted">{labels.listHint}</p>
              </div>
              <button type="button" onClick={startCreate} disabled={busy}>{labels.createLabel}</button>
            </div>

            <div className="admin-projects__list">
              {items.length > 0 ? items.map((project) => {
                const isActive = editingId === project.id;
                return (
                  <article key={project.id} className={`admin-projects__item${isActive ? " admin-projects__item--active" : ""}`}>
                    <div className="admin-projects__item-top">
                      <div className="admin-projects__item-copy">
                        <strong>{project.title.ru || project.title.en}</strong>
                        <p className="admin-muted">{project.summary.ru || project.summary.en}</p>
                      </div>
                      <span className="admin-status-badge admin-status-badge--neutral">{templateBadge(project.template)}</span>
                    </div>
                    <div className="admin-projects__item-meta">
                      <span>{project.id}</span>
                      <span>{project.tags.length} tags</span>
                      <span>{project.screenshots.length} screenshots</span>
                    </div>
                    <div className="admin-projects__item-actions">
                      <button type="button" onClick={() => startEdit(project.id)} disabled={busy}>Edit</button>
                      <a href={`/projects/${project.id}`} target="_blank" rel="noreferrer">Open</a>
                      <button type="button" onClick={() => void handleDelete(project.id)} disabled={busy}>Delete</button>
                    </div>
                  </article>
                );
              }) : (
                <div className="admin-projects__empty">
                  <strong>Empty</strong>
                  <p className="admin-muted">{labels.empty}</p>
                </div>
              )}
            </div>
          </aside>

          <article className="admin-card admin-projects__editor">
            <div className="admin-panel__header">
              <div>
                <h2>{editingId ? labels.editTitle : labels.createTitle}</h2>
                <p className="admin-muted">{labels.editorHint}</p>
              </div>
              {editingId ? <button type="button" onClick={startCreate} disabled={busy}>Reset form</button> : null}
            </div>

            <form className="admin-form" onSubmit={handleSubmit}>
              <div className="admin-projects__field-grid">
                <label>
                  Slug
                  <input value={draft.id} onChange={(event) => setDraft((current) => ({ ...current, id: event.target.value }))} placeholder="finance-tracker" />
                  <small className="admin-muted">If empty, slug will be generated from title.</small>
                </label>

                {!isPostsMode ? (
                  <label>
                    Template type
                    <select
                      data-testid="template-type-select"
                      value={draft.templateType}
                      onChange={(event) => {
                        const nextTemplateType = event.target.value as TemplateType;
                        setDraft((current) => ({
                          ...current,
                          templateType: nextTemplateType,
                          backendFiles: nextTemplateType === "Static" ? [] : current.backendFiles
                        }));
                      }}
                    >
                      {TEMPLATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                ) : (
                  <div className="admin-projects__template-note">
                    <strong>Posts mode</strong>
                    <p className="admin-muted">Runtime templates are disabled in this section.</p>
                  </div>
                )}
              </div>

              {!isPostsMode && templateDetails ? (
                <section className="admin-template-accordion" data-testid="template-instructions">
                  <details open>
                    <summary>Template upload instructions</summary>
                    <TemplateDropzone
                      title="Frontend bundle"
                      hint={templateDetails.frontend}
                      files={draft.frontendFiles}
                      onFilesChange={(files) => setDraft((current) => ({ ...current, frontendFiles: files }))}
                    />
                    {draft.templateType !== "Static" ? (
                      <TemplateDropzone
                        title="Backend bundle"
                        hint={templateDetails.backend}
                        files={draft.backendFiles}
                        onFilesChange={(files) => setDraft((current) => ({ ...current, backendFiles: files }))}
                      />
                    ) : null}
                  </details>
                </section>
              ) : null}

              <div className="admin-projects__field-grid">
                <label>
                  Title (EN)
                  <input required value={draft.titleEn} onChange={(event) => setDraft((current) => ({ ...current, titleEn: event.target.value }))} />
                </label>
                <label>
                  Title (RU)
                  <input value={draft.titleRu} onChange={(event) => setDraft((current) => ({ ...current, titleRu: event.target.value }))} />
                </label>
                <label>
                  Summary (EN)
                  <textarea rows={3} value={draft.summaryEn} onChange={(event) => setDraft((current) => ({ ...current, summaryEn: event.target.value }))} />
                </label>
                <label>
                  Summary (RU)
                  <textarea rows={3} value={draft.summaryRu} onChange={(event) => setDraft((current) => ({ ...current, summaryRu: event.target.value }))} />
                </label>
              </div>

              <div className="admin-projects__field-grid admin-projects__field-grid--wide">
                <label>
                  Description (EN)
                  <textarea rows={6} value={draft.descriptionEn} onChange={(event) => setDraft((current) => ({ ...current, descriptionEn: event.target.value }))} />
                  <small className="admin-muted">Blank line creates a new paragraph.</small>
                </label>
                <label>
                  Description (RU)
                  <textarea rows={6} value={draft.descriptionRu} onChange={(event) => setDraft((current) => ({ ...current, descriptionRu: event.target.value }))} />
                  <small className="admin-muted">Blank line creates a new paragraph.</small>
                </label>
              </div>

              <label>
                Tags
                <input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="React, TypeScript, API" />
                <small className="admin-muted">Separate tags with commas.</small>
              </label>

              <section className="admin-projects__media-grid">
                <label>
                  Cover for light theme
                  <input type="file" accept="image/*" onChange={(event) => void handleSingleImage(event, "heroLight")} />
                </label>
                <label>
                  Cover for dark theme
                  <input type="file" accept="image/*" onChange={(event) => void handleSingleImage(event, "heroDark")} />
                </label>
              </section>

              <label>
                Screenshots
                <input ref={screenshotInputRef} type="file" accept="image/*" multiple onChange={(event) => void handleScreenshots(event)} hidden />
                <div className="admin-screenshot-grid">
                  {draft.screenshots.map((image, index) => (
                    <div key={`${index}:${image.slice(0, 24)}`} className="admin-screenshot-tile">
                      <img src={image} alt={`Screenshot ${index + 1}`} />
                      <button type="button" className="admin-screenshot-add" title="Add more" onClick={() => screenshotInputRef.current?.click()}>+</button>
                      <button type="button" className="admin-screenshot-remove" title="Remove screenshot" onClick={() => removeScreenshot(index)}>×</button>
                    </div>
                  ))}
                  <button type="button" className="admin-screenshot-tile admin-screenshot-tile--add" onClick={() => screenshotInputRef.current?.click()}>
                    <span>+</span>
                    <small>Add screenshots</small>
                  </button>
                </div>
              </label>

              <section className="admin-projects__media-grid">
                <label>
                  Video
                  <div className="admin-video-toggle">
                    <button
                      type="button"
                      className={draft.includeVideo ? "is-active" : ""}
                      onClick={() => setDraft((current) => ({ ...current, includeVideo: !current.includeVideo, videoUrl: current.includeVideo ? "" : current.videoUrl }))}
                    >
                      {draft.includeVideo ? "Video enabled" : "Video disabled"}
                    </button>
                  </div>
                  {draft.includeVideo ? (
                    <>
                      <input type="file" accept="video/*" onChange={(event) => void handleVideo(event)} />
                      <small className="admin-muted">Uploading a new file replaces current video.</small>
                    </>
                  ) : (
                    <small className="admin-muted">Video is optional.</small>
                  )}
                </label>

                <div className="admin-projects__template-note admin-projects__template-note--preview">
                  <strong>Content preview</strong>
                  <p className="admin-muted">This entry appears in catalog, cards and detail page.</p>
                  <div className="admin-projects__preview-meta">
                    <span>{draft.heroLight ? "Light cover set" : "No light cover"}</span>
                    <span>{draft.heroDark ? "Dark cover set" : "No dark cover"}</span>
                    <span>{draft.screenshots.length} screenshots</span>
                    <span>{draft.includeVideo && draft.videoUrl ? "Video attached" : "No video"}</span>
                  </div>
                </div>
              </section>

              <div className="admin-projects__submit-row">
                <button type="submit" disabled={busy} data-testid="project-submit">
                  {busy ? "Saving..." : editingId ? labels.submitEdit : labels.submitCreate}
                </button>
                <p className="admin-muted">Changes are synchronized with server and local cache after save.</p>
              </div>
            </form>
          </article>
        </div>
      </article>
    </section>
  );
}
