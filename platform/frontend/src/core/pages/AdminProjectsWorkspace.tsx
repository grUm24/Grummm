import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useDropzone, type DropEvent } from "react-dropzone";
import { Link } from "react-router-dom";
import {
  createProject,
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
  videoUrl: string;
  templateType: TemplateType;
  frontendFiles: File[];
  backendFiles: File[];
}

const TEMPLATE_OPTIONS: Array<{ value: TemplateType; label: string }> = [
  { value: "None", label: "None" },
  { value: "Static", label: "Static" },
  { value: "CSharp", label: "C#" },
  { value: "Python", label: "Python" },
  { value: "JavaScript", label: "JavaScript" }
];

const TEMPLATE_INSTRUCTIONS: Record<Exclude<TemplateType, "None">, { frontend: string; backend: string }> = {
  Static: {
    frontend: "Drag dist here (index.html + assets).",
    backend: "Backend archive optional for static template."
  },
  CSharp: {
    frontend: "Drag dist here (SPA bundle for dashboard/client).",
    backend: "Upload compiled DLL + deps.json (+ runtimeconfig if needed)."
  },
  Python: {
    frontend: "Drag dist here (optional static client).",
    backend: "Upload Python service files (app package, requirements.txt, entrypoint)."
  },
  JavaScript: {
    frontend: "Drag dist here (bundled frontend build).",
    backend: "Upload backend runtime files (Node service, package metadata)."
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
    videoUrl: "",
    templateType: "None",
    frontendFiles: [],
    backendFiles: []
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
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
    videoUrl: draft.videoUrl || undefined,
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
    onDropAccepted: (accepted) => {
      if (accepted.length === 0) {
        return;
      }

      const merged = [...files, ...accepted];
      const unique = new Map<string, File>();
      merged.forEach((file) => unique.set(`${file.webkitRelativePath || file.name}:${file.size}`, file));
      onFilesChange(Array.from(unique.values()));
    },
    multiple: true,
    useFsAccessApi: true,
    getFilesFromEvent: getFilesRecursively
  });

  return (
    <section className="admin-dropzone-wrap">
      <strong>{title}</strong>
      <p className="admin-muted">{hint}</p>
      <div className={`admin-dropzone ${isDragActive ? "is-active" : ""}`} {...getRootProps()}>
        <input {...getInputProps()} />
        <p>{isDragActive ? "Release to upload files" : "Drag files/folder or click to select"}</p>
      </div>
      <p className="admin-muted">Selected files: {files.length}</p>
      {files.length > 0 ? (
        <ul className="admin-file-list">
          {files.slice(0, 6).map((file) => (
            <li key={`${file.webkitRelativePath || file.name}:${file.size}`}>{file.webkitRelativePath || file.name}</li>
          ))}
          {files.length > 6 ? <li>...and {files.length - 6} more</li> : null}
        </ul>
      ) : null}
      {files.length > 0 ? (
        <button type="button" onClick={() => onFilesChange([])}>
          Clear files
        </button>
      ) : null}
    </section>
  );
}

export function AdminProjectsWorkspace() {
  const projects = useProjectPosts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftProject>(() => emptyDraft());
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(() => [...projects].sort((a, b) => a.title.en.localeCompare(b.title.en)), [projects]);

  function startCreate() {
    setEditingId(null);
    setDraft(emptyDraft());
  }

  function startEdit(project: PortfolioProject) {
    setEditingId(project.id);
    setDraft(toDraft(project));
  }

  async function handleSingleImage(event: ChangeEvent<HTMLInputElement>, field: "heroLight" | "heroDark") {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setDraft((current) => ({ ...current, [field]: dataUrl }));
  }

  async function handleScreenshots(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const dataUrls = await Promise.all(files.map((f) => fileToDataUrl(f)));
    setDraft((current) => ({ ...current, screenshots: dataUrls }));
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

    const project = fromDraft(draft);
    const upload: ProjectUploadBundle = {
      templateType: draft.templateType,
      frontendFiles: draft.frontendFiles,
      backendFiles: draft.backendFiles
    };

    if (editingId) {
      await updateProject(editingId, project, upload);
    } else {
      await createProject(project, upload);
    }

    setBusy(false);
    setEditingId(null);
    setDraft(emptyDraft());
  }

  async function handleDelete(projectId: string) {
    if (!window.confirm("Delete this project post?")) {
      return;
    }
    await deleteProject(projectId);
    if (editingId === projectId) {
      setEditingId(null);
      setDraft(emptyDraft());
    }
  }

  const templateDetails = draft.templateType === "None" ? null : TEMPLATE_INSTRUCTIONS[draft.templateType];

  return (
    <section className="admin-projects">
      <header className="admin-card">
        <h1>Projects Workspace</h1>
        <p>Manage project posts shown in public `/projects` and `/projects/:id`.</p>
        <button type="button" onClick={startCreate}>
          New Project Post
        </button>
      </header>

      <div className="admin-projects__grid">
        <article className="admin-card">
          <h2>{editingId ? "Edit Post" : "Create Post"}</h2>
          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              Slug (optional for create)
              <input
                value={draft.id}
                onChange={(e) => setDraft((c) => ({ ...c, id: e.target.value }))}
                placeholder="finance-tracker"
              />
            </label>
            <label>
              Template Type
              <select
                data-testid="template-type-select"
                value={draft.templateType}
                onChange={(e) => setDraft((c) => ({ ...c, templateType: e.target.value as TemplateType }))}
              >
                {TEMPLATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {templateDetails ? (
              <section className="admin-template-accordion" data-testid="template-instructions">
                <details open>
                  <summary>Template Upload Instructions</summary>
                  <TemplateDropzone
                    title="Frontend Bundle"
                    hint={templateDetails.frontend}
                    files={draft.frontendFiles}
                    onFilesChange={(files) => setDraft((current) => ({ ...current, frontendFiles: files }))}
                  />
                  <TemplateDropzone
                    title="Backend Bundle"
                    hint={templateDetails.backend}
                    files={draft.backendFiles}
                    onFilesChange={(files) => setDraft((current) => ({ ...current, backendFiles: files }))}
                  />
                </details>
              </section>
            ) : null}

            <label>
              Title (EN)
              <input
                required
                value={draft.titleEn}
                onChange={(e) => setDraft((c) => ({ ...c, titleEn: e.target.value }))}
              />
            </label>
            <label>
              Title (RU)
              <input
                value={draft.titleRu}
                onChange={(e) => setDraft((c) => ({ ...c, titleRu: e.target.value }))}
              />
            </label>
            <label>
              Summary (EN)
              <textarea
                rows={2}
                value={draft.summaryEn}
                onChange={(e) => setDraft((c) => ({ ...c, summaryEn: e.target.value }))}
              />
            </label>
            <label>
              Summary (RU)
              <textarea
                rows={2}
                value={draft.summaryRu}
                onChange={(e) => setDraft((c) => ({ ...c, summaryRu: e.target.value }))}
              />
            </label>
            <label>
              Description (EN)
              <textarea
                rows={4}
                value={draft.descriptionEn}
                onChange={(e) => setDraft((c) => ({ ...c, descriptionEn: e.target.value }))}
              />
            </label>
            <label>
              Description (RU)
              <textarea
                rows={4}
                value={draft.descriptionRu}
                onChange={(e) => setDraft((c) => ({ ...c, descriptionRu: e.target.value }))}
              />
            </label>
            <label>
              Tags (comma separated)
              <input
                value={draft.tags}
                onChange={(e) => setDraft((c) => ({ ...c, tags: e.target.value }))}
                placeholder="React, TypeScript, API"
              />
            </label>
            <label>
              Cover Image (Light)
              <input type="file" accept="image/*" onChange={(e) => void handleSingleImage(e, "heroLight")} />
            </label>
            <label>
              Cover Image (Dark)
              <input type="file" accept="image/*" onChange={(e) => void handleSingleImage(e, "heroDark")} />
            </label>
            <label>
              Screenshots (multiple)
              <input type="file" accept="image/*" multiple onChange={(e) => void handleScreenshots(e)} />
            </label>
            <label>
              Video
              <input type="file" accept="video/*" onChange={(e) => void handleVideo(e)} />
            </label>
            <button type="submit" disabled={busy} data-testid="project-submit">
              {editingId ? "Save Changes" : "Create Post"}
            </button>
          </form>
        </article>

        <article className="admin-card">
          <h2>Existing Posts</h2>
          <div className="admin-projects__list">
            {sorted.map((project) => (
              <div key={project.id} className="admin-projects__item">
                <div>
                  <strong>{project.title.en}</strong>
                  <p>{project.id}</p>
                </div>
                <div className="admin-chip-nav">
                  <button type="button" onClick={() => startEdit(project)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => void handleDelete(project.id)}>
                    Delete
                  </button>
                  <Link to={`/projects/${project.id}`}>View</Link>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

