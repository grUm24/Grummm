import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useDropzone, type DropEvent } from "react-dropzone";
import { useSearchParams } from "react-router-dom";
import { AdminPostBlocksEditor } from "../components/AdminPostBlocksEditor";
import { AdminRelationsSelector } from "../components/AdminRelationsSelector";
import { AdminTopicsManager } from "../components/AdminTopicsManager";
import { useNotification } from "../components/Notifications";
import { formatPublishedMeta } from "../../public/formatPublishedDate";
import {
  createProjectWithOptions,
  deleteProject,
  getPortfolioKind,
  uploadPostVideoFile,
  updateProject,
  useProjectPosts,
  type ProjectUploadBundle
} from "../../public/data/project-store";
import type { PortfolioContentBlock, PortfolioProject, PortfolioVisibility, TemplateType } from "../../public/types";

interface DraftProject {
  id: string;
  titleEn: string;
  titleRu: string;
  summaryEn: string;
  summaryRu: string;
  descriptionEn: string;
  descriptionRu: string;
  contentBlocks: PortfolioContentBlock[];
  tags: string;
  heroLight: string;
  heroDark: string;
  screenshots: string[];
  includeVideo: boolean;
  videoUrl: string;
  templateType: TemplateType;
  visibility: PortfolioVisibility;
  frontendFiles: File[];
  backendFiles: File[];
}

const MAX_IMAGE_FILE_BYTES = 100 * 1024 * 1024;

interface TemplateOption {
  value: TemplateType;
  label: string;
  description: string;
  disabled?: boolean;
}

const RUNTIME_TEMPLATE_OPTIONS_ENABLED = false;

const TEMPLATE_OPTIONS: TemplateOption[] = [
  { value: "None", label: "No template", description: "Editorial-style entry without runtime bundle." },
  { value: "Static", label: "Static", description: "Static frontend only, without server runtime." },
  { value: "CSharp", label: "C#", description: "ASP.NET runtime with frontend and DLL bundle.", disabled: !RUNTIME_TEMPLATE_OPTIONS_ENABLED },
  { value: "Python", label: "Python", description: "Python service with requirements and app files.", disabled: !RUNTIME_TEMPLATE_OPTIONS_ENABLED },
  { value: "JavaScript", label: "JavaScript", description: "Node.js runtime with package-based backend.", disabled: !RUNTIME_TEMPLATE_OPTIONS_ENABLED }
];

const VISIBILITY_OPTIONS: Array<{ value: PortfolioVisibility; label: string; hint: string }> = [
  { value: "public", label: "Public", hint: "Visible in public catalog." },
  { value: "private", label: "Private", hint: "Visible only in admin workspace." },
  { value: "demo", label: "Demo", hint: "Public entry with sandboxed demo." }
];

const TEMPLATE_INSTRUCTIONS: Record<Exclude<TemplateType, "None">, { frontend: string; backend: string }> = {
  Static: {
    frontend: "Upload dist folder or zip archive with static build. It must include index.html and assets.",
    backend: "Backend is not required for Static template and will be ignored."
  },
  CSharp: {
    frontend: "Runtime-backed templates are disabled on this deployment.",
    backend: "Re-enable runtime templates separately before uploading C# bundles."
  },
  Python: {
    frontend: "Runtime-backed templates are disabled on this deployment.",
    backend: "Re-enable runtime templates separately before uploading Python bundles."
  },
  JavaScript: {
    frontend: "Runtime-backed templates are disabled on this deployment.",
    backend: "Re-enable runtime templates separately before uploading Node.js bundles."
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
  Static: undefined,
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
    contentBlocks: [],
    tags: "",
    heroLight: "",
    heroDark: "",
    screenshots: [],
    includeVideo: false,
    videoUrl: "",
    templateType: "None",
    visibility: "public",
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

  if (file.type === "image/gif") {
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

function cloneBlocks(blocks: PortfolioContentBlock[] | undefined): PortfolioContentBlock[] {
  return (blocks ?? []).map((block) => ({
    ...block,
    content: block.content ? { ...block.content } : undefined
  }));
}

function firstTextBlockValue(blocks: PortfolioContentBlock[], language: "en" | "ru"): string {
  for (const block of blocks) {
    if (block.type === "image") {
      continue;
    }

    const value = language === "ru" ? block.content?.ru : block.content?.en;
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function TemplateTypeSelect({
  value,
  options,
  disabled,
  onChange
}: {
  value: TemplateType;
  options: TemplateOption[];
  disabled?: boolean;
  onChange: (value: TemplateType) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const currentOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`template-select${open ? " is-open" : ""}`} ref={rootRef} data-testid="template-type-select">
      <button
        type="button"
        className="template-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="template-select__trigger-copy">
          <strong>{currentOption.label}</strong>
          <small>{currentOption.description}</small>
        </span>
        <span className="template-select__chevron" aria-hidden="true">{"\u25BE"}</span>
      </button>

      {open ? (
        <div className="template-select__panel" role="listbox" aria-label="Template type">
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={`template-select__option${selected ? " is-selected" : ""}`}
                onClick={() => {
                  if (option.disabled) {
                    return;
                  }
                  onChange(option.value);
                  setOpen(false);
                }}
                disabled={option.disabled}
              >
                <span className="template-select__option-copy">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                <span className="template-select__check" aria-hidden="true">{selected ? "\u2713" : ""}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
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
    contentBlocks: cloneBlocks(project.contentBlocks),
    tags: project.tags.join(", "),
    heroLight: project.heroImage.light,
    heroDark: project.heroImage.dark,
    screenshots: project.screenshots.map((item) => item.light),
    includeVideo: Boolean(project.videoUrl),
    videoUrl: project.videoUrl ?? "",
    templateType: project.template ?? "None",
    visibility: project.visibility ?? (project.publicDemoEnabled ? "demo" : "public"),
    frontendFiles: [],
    backendFiles: []
  };
}

function fromDraft(draft: DraftProject, kind: "post" | "project"): PortfolioProject {
  const tags = draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  const fallbackCover = "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'><rect width='800' height='450' fill='#168ba6'/><text x='40' y='90' font-size='48' fill='white'>Project Cover</text></svg>");
  const coverLight = draft.heroLight || fallbackCover;
  const coverDark = draft.heroDark || coverLight;
  const contentBlocks = draft.contentBlocks.filter((block) => {
    if (block.type === "image") {
      return Boolean(block.imageUrl);
    }

    if (block.type === "video") {
      return Boolean(block.videoUrl);
    }

    return Boolean(block.content?.en?.trim() || block.content?.ru?.trim());
  });

  const fallbackDescriptionEn = draft.descriptionEn.trim() || firstTextBlockValue(contentBlocks, "en") || draft.summaryEn || "No description yet.";
  const fallbackDescriptionRu = draft.descriptionRu.trim() || firstTextBlockValue(contentBlocks, "ru") || draft.summaryRu || draft.summaryEn || "No description yet.";
  const templateType = kind === "post" ? "None" : draft.templateType;
  const visibility = kind === "post"
    ? "public"
    : (draft.visibility === "demo" && templateType !== "Static" ? "public" : draft.visibility);

  return {
    id: draft.id,
    kind,
    visibility,
    title: { en: draft.titleEn || "Untitled", ru: draft.titleRu || draft.titleEn || "No title" },
    summary: { en: draft.summaryEn || "No summary yet.", ru: draft.summaryRu || draft.summaryEn || "No summary yet." },
    description: { en: fallbackDescriptionEn, ru: fallbackDescriptionRu },
    contentBlocks,
    tags,
    heroImage: { light: coverLight, dark: coverDark },
    screenshots: kind === "post"
      ? []
      : (draft.screenshots.length > 0 ? draft.screenshots.map((image) => ({ light: image, dark: image })) : [{ light: coverLight, dark: coverDark }]),
    videoUrl: kind === "post" ? undefined : (draft.includeVideo ? draft.videoUrl || undefined : undefined),
    template: templateType,
    publicDemoEnabled: kind === "project" && templateType === "Static" && visibility === "demo",
    frontendPath: kind === "post" ? undefined : DEFAULT_FRONTEND_PATH[templateType],
    backendPath: kind === "post" ? undefined : DEFAULT_BACKEND_PATH[templateType]
  };
}

function templateBadge(project: PortfolioProject): string {
  const kind = getPortfolioKind(project);
  if (kind === "post") {
    return "Post";
  }

  const current = project.template ?? "None";
  return current === "CSharp" ? "C#" : current;
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
        description: "Create editorial posts as structured blocks with separate English and Russian content.",
        listTitle: "Published posts",
        listHint: "Select an existing post to edit or start a new one.",
        createLabel: "New post",
        editTitle: "Edit post",
        createTitle: "Create post",
        editorHint: "Posts keep title, short summary, themed cover, tags, and a block-based body.",
        submitCreate: "Create post",
        submitEdit: "Save changes",
        empty: "No posts yet.",
        deletePrompt: "Delete this post permanently?"
      }
    : {
        eyebrow: "Projects workspace",
        title: "Projects editor",
        description: "Manage static project entries, public demos, and private project pages in one place.",
        listTitle: "Projects",
        listHint: "Open a project card to edit content or upload a new build.",
        createLabel: "New project",
        editTitle: "Edit project",
        createTitle: "Create project",
        editorHint: "Pick post or static project flow, fill content, and upload frontend build when needed.",
        submitCreate: "Create project",
        submitEdit: "Save changes",
        empty: "No projects yet.",
        deletePrompt: "Delete this project permanently?"
      };

  const projects = useProjectPosts();
  const [searchParams, setSearchParams] = useSearchParams();
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);
  const heroLightInputRef = useRef<HTMLInputElement | null>(null);
  const heroDarkInputRef = useRef<HTMLInputElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftProject>(() => emptyDraft());
  const notify = useNotification();
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  const items = useMemo(
    () =>
      [...projects]
        .filter((project) => isPostsMode ? getPortfolioKind(project) === "post" : getPortfolioKind(project) === "project")
        .sort((a, b) => a.title.en.localeCompare(b.title.en)),
    [projects, isPostsMode]
  );
  const editingItem = useMemo(
    () => (editingId ? items.find((project) => project.id === editingId) ?? null : null),
    [editingId, items]
  );
  const publishedPreview = useMemo(() => {
    if (!isPostsMode) {
      return null;
    }

    if (!editingItem?.publishedAt) {
      return editingId ? "Publication date unavailable" : "Publication date will be set on first save";
    }

    return formatPublishedMeta(editingItem.publishedAt, "en");
  }, [editingId, editingItem, isPostsMode]);

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
      notify.success(isPostsMode ? "Post deleted" : "Project deleted");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to delete item.";
      setServerError(msg);
      notify.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handlePostVideoUpload(file: File): Promise<string> {
    setServerError("");

    try {
      return await uploadPostVideoFile(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload video.";
      setServerError(message);
      throw error;
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setServerError("");

    const kind = isPostsMode ? "post" : "project";
    const project = fromDraft(draft, kind);
    const upload: ProjectUploadBundle | undefined = isPostsMode
      ? undefined
      : { templateType: draft.templateType, frontendFiles: draft.frontendFiles, backendFiles: draft.backendFiles };

    try {
      if (editingId) {
        await updateProject(editingId, project, upload, { serverOnly: true });
      } else {
        await createProjectWithOptions(project, upload, { serverOnly: true });
      }
      notify.success(editingId ? "Saved successfully" : "Created successfully");
      startCreate();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to synchronize with server.";
      setServerError(msg);
      notify.error(msg);
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

        <div className="admin-projects__workspace-grid admin-projects__workspace-grid--single">
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
                  <>
                    <label>
                      Template type
                      <TemplateTypeSelect
                        value={draft.templateType}
                        options={TEMPLATE_OPTIONS}
                        disabled={busy}
                        onChange={(nextTemplateType) => {
                          setDraft((current) => ({
                            ...current,
                            templateType: nextTemplateType,
                            visibility: nextTemplateType === "Static" ? current.visibility : (current.visibility === "demo" ? "public" : current.visibility),
                            backendFiles: nextTemplateType === "Static" ? [] : current.backendFiles
                          }));
                        }}
                      />
                    </label>
                    <div className="admin-projects__template-note admin-projects__template-note--compact">
                      <strong>Project visibility</strong>
                      <div className="admin-visibility-switch" role="group" aria-label="Project visibility">
                        {VISIBILITY_OPTIONS.map((option) => {
                          const disabled = option.value === "demo" && draft.templateType !== "Static";
                          const selected = draft.visibility === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={selected ? "is-active" : ""}
                              disabled={disabled}
                              onClick={() => setDraft((current) => ({
                                ...current,
                                visibility: disabled ? current.visibility : option.value
                              }))}
                            >
                              <strong>{option.label}</strong>
                              <small>{option.hint}</small>
                            </button>
                          );
                        })}
                      </div>
                      {!RUNTIME_TEMPLATE_OPTIONS_ENABLED ? (
                        <p className="admin-muted">This deployment supports posts, private static projects, and public static demos. Runtime-backed templates are disabled.</p>
                      ) : draft.templateType !== "Static" ? (
                        <p className="admin-muted">Demo mode is available only for Static projects. Server runtimes remain private behind admin routes.</p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="admin-projects__template-note">
                    <strong>Posts mode</strong>
                    <p className="admin-muted">Posts are stored as structured editorial content. Runtime templates are disabled here.</p>
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

              {isPostsMode ? (
                <AdminPostBlocksEditor
                  blocks={draft.contentBlocks}
                  disabled={busy}
                  onChange={(contentBlocks) => setDraft((current) => ({ ...current, contentBlocks }))}
                  onCreateImageDataUrl={imageFileToOptimizedDataUrl}
                  onUploadVideoFile={handlePostVideoUpload}
                />
              ) : (
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
              )}

              <label>
                Tags
                <input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="React, TypeScript, API" />
                <small className="admin-muted">Separate tags with commas.</small>
              </label>

              <section className="admin-projects__media-grid">
                <label className="admin-file-picker">
                  <span>Cover for light theme</span>
                  <input ref={heroLightInputRef} type="file" accept="image/*" hidden onChange={(event) => void handleSingleImage(event, "heroLight")} />
                  <button type="button" className="admin-file-picker__button" onClick={() => heroLightInputRef.current?.click()}>
                    {draft.heroLight ? "Replace light cover" : "Choose light cover"}
                  </button>
                  <small className="admin-file-picker__status">{draft.heroLight ? "Light cover ready" : "No file selected"}</small>
                </label>
                <label className="admin-file-picker">
                  <span>Cover for dark theme</span>
                  <input ref={heroDarkInputRef} type="file" accept="image/*" hidden onChange={(event) => void handleSingleImage(event, "heroDark")} />
                  <button type="button" className="admin-file-picker__button" onClick={() => heroDarkInputRef.current?.click()}>
                    {draft.heroDark ? "Replace dark cover" : "Choose dark cover"}
                  </button>
                  <small className="admin-file-picker__status">{draft.heroDark ? "Dark cover ready" : "No file selected"}</small>
                </label>
              </section>

              {!isPostsMode ? (
                <label>
                  Screenshots
                  <input ref={screenshotInputRef} type="file" accept="image/*" multiple onChange={(event) => void handleScreenshots(event)} hidden />
                  <div className="admin-screenshot-grid">
                    {draft.screenshots.map((image, index) => (
                      <div key={`${index}:${image.slice(0, 24)}`} className="admin-screenshot-tile">
                        <img src={image} alt={`Screenshot ${index + 1}`} />
                        <button type="button" className="admin-screenshot-add" title="Add more" onClick={() => screenshotInputRef.current?.click()}>+</button>
                        <button type="button" className="admin-screenshot-remove" title="Remove screenshot" onClick={() => removeScreenshot(index)}>{"\u00D7"}</button>
                      </div>
                    ))}
                    <button type="button" className="admin-screenshot-tile admin-screenshot-tile--add" onClick={() => screenshotInputRef.current?.click()}>
                      <span>+</span>
                      <small>Add screenshots</small>
                    </button>
                  </div>
                </label>
              ) : null}

              <section className="admin-projects__media-grid">
                {!isPostsMode ? (
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
                ) : (
                  <div className="admin-projects__template-note admin-projects__template-note--preview">
                    <strong>Post publishing</strong>
                    <p className="admin-muted">The public post shows title, summary, cover, structured body blocks, and related links to other entries.</p>
                  </div>
                )}

                <div className="admin-projects__template-note admin-projects__template-note--preview">
                  <strong>Content preview</strong>
                  <p className="admin-muted">This entry appears in catalog, cards and detail page.</p>
                  <div className="admin-projects__preview-meta">
                    <span>{draft.heroLight ? "Light cover set" : "No light cover"}</span>
                    <span>{draft.heroDark ? "Dark cover set" : "No dark cover"}</span>
                    <span>{isPostsMode ? `${draft.contentBlocks.length} blocks` : `${draft.screenshots.length} screenshots`}</span>
                    <span>{isPostsMode ? "Structured post" : (draft.visibility === "private" ? "Private project" : (draft.visibility === "demo" && draft.templateType === "Static" ? "Public demo enabled" : "Public project"))}</span>
                  </div>
                </div>
              </section>

              {editingId ? (
                <section className="admin-projects__relations-section">
                  <AdminTopicsManager />
                  <AdminRelationsSelector projectId={editingId} />
                </section>
              ) : null}

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
