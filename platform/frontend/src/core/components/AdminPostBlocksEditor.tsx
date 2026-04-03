import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { useDropzone } from "react-dropzone";
import type { Language, PortfolioContentBlock, PortfolioContentBlockType } from "../../public/types";
import { t } from "../../shared/i18n";

interface AdminPostBlocksEditorProps {
  blocks: PortfolioContentBlock[];
  disabled: boolean;
  language: Language;
  onChange: (blocks: PortfolioContentBlock[]) => void;
  onCreateImageDataUrl: (file: File) => Promise<string>;
  onUploadVideoFile: (file: File) => Promise<string>;
}

interface PostVideoUploadFieldProps {
  block: PortfolioContentBlock;
  disabled: boolean;
  language: Language;
  onUploadVideoFile: (file: File) => Promise<string>;
  onUpdate: (updater: (block: PortfolioContentBlock) => PortfolioContentBlock) => void;
}

interface BlockInserterProps {
  disabled: boolean;
  language: Language;
  onInsert: (type: PortfolioContentBlockType) => void;
}

const BLOCK_OPTIONS: Array<{ type: PortfolioContentBlockType; labelKey: string; icon: string }> = [
  { type: "paragraph", labelKey: "admin.blocks.paragraph", icon: "¶" },
  { type: "subheading", labelKey: "admin.blocks.subheading", icon: "H" },
  { type: "callout", labelKey: "admin.blocks.callout", icon: "❝" },
  { type: "numberedList", labelKey: "admin.blocks.list", icon: "#" },
  { type: "image", labelKey: "admin.blocks.image", icon: "▣" },
  { type: "video", labelKey: "admin.blocks.video", icon: "▶" },
  { type: "collage", labelKey: "admin.blocks.collage", icon: "⊞" },
  { type: "typewriter", labelKey: "admin.blocks.typewriter", icon: "⌨" }
];

function getBlockLabel(type: PortfolioContentBlockType, language: Language): string {
  const option = BLOCK_OPTIONS.find((o) => o.type === type);
  return option ? t(option.labelKey, language) : type;
}

function createBlock(type: PortfolioContentBlockType): PortfolioContentBlock {
  const hasText = type !== "image" && type !== "collage";
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type,
    content: hasText ? { en: "", ru: "" } : undefined,
    imageUrl: type === "image" ? "" : undefined,
    images: type === "collage" ? [] : undefined,
    videoUrl: type === "video" ? "" : undefined,
    posterUrl: undefined,
    pinEnabled: undefined,
    scrollSpan: type === "typewriter" ? 80 : undefined
  };
}

function getTextRows(type: PortfolioContentBlockType): number {
  if (type === "subheading") return 2;
  if (type === "callout") return 4;
  if (type === "numberedList") return 6;
  if (type === "typewriter") return 4;
  return 5;
}

function getTextHelp(type: PortfolioContentBlockType, language: Language): string | null {
  if (type === "numberedList") return t("admin.blocks.listHelp", language);
  if (type === "callout") return t("admin.blocks.calloutHelp", language);
  if (type === "typewriter") return t("admin.blocks.typewriterHelp", language);
  return null;
}

function BlockInserter({ disabled, language, onInsert }: BlockInserterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className={`block-inserter${open ? " is-open" : ""}`} ref={ref}>
      <button
        type="button"
        className="block-inserter__trigger"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label={t("admin.blocks.insertAria", language)}
      >
        <span className="block-inserter__line" />
        <span className="block-inserter__plus">+</span>
        <span className="block-inserter__line" />
      </button>

      {open ? (
        <div className="block-inserter__picker" role="listbox" aria-label={t("admin.blocks.chooseAria", language)}>
          {BLOCK_OPTIONS.map((option) => {
            const label = t(option.labelKey, language);
            return (
              <button
                key={option.type}
                type="button"
                className="block-inserter__option"
                onClick={() => {
                  onInsert(option.type);
                  setOpen(false);
                }}
                disabled={disabled}
                title={label}
              >
                <span className="block-inserter__icon">{option.icon}</span>
                <span className="block-inserter__label">{label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function PostVideoUploadField({ block, disabled, language, onUploadVideoFile, onUpdate }: PostVideoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleUpload(file: File) {
    setUploadError("");
    setUploading(true);

    try {
      const videoUrl = await onUploadVideoFile(file);
      onUpdate((current) => ({ ...current, videoUrl }));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to upload video.");
    } finally {
      setUploading(false);
    }
  }

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { "video/*": [".mp4", ".webm", ".mov", ".m4v"] },
    multiple: false,
    disabled: disabled || uploading,
    noClick: true,
    onDropAccepted: (files) => {
      const file = files[0];
      if (file) void handleUpload(file);
    },
    onDropRejected: () => {
      setUploadError(t("admin.blocks.videoError", language));
    }
  });

  return (
    <div className="admin-post-block__video">
      <div className="admin-post-block__video-dropzone-wrap">
        <div
          {...getRootProps()}
          className={`admin-post-block__video-dropzone${isDragActive ? " is-active" : ""}${uploading ? " is-uploading" : ""}`}
        >
          <input {...getInputProps()} />
          <strong>{uploading ? t("admin.blocks.videoDropUploading", language) : t("admin.blocks.videoDropTitle", language)}</strong>
          <p className="admin-muted">
            {isDragActive
              ? t("admin.blocks.videoDropActive", language)
              : t("admin.blocks.videoDropHint", language)}
          </p>
          <button type="button" onClick={open} disabled={disabled || uploading}>
            {block.videoUrl ? t("admin.blocks.videoReplace", language) : t("admin.blocks.videoChoose", language)}
          </button>
        </div>
        {block.videoUrl ? <p className="admin-muted">{t("admin.blocks.videoReady", language)}</p> : null}
        {uploadError ? <p className="admin-error">{uploadError}</p> : null}
      </div>

      <div className="admin-post-block__fields">
        <label>
          {t("admin.blocks.videoSourceUrl", language)}
          <input
            type="text"
            inputMode="url"
            spellCheck={false}
            placeholder={t("admin.blocks.videoSourcePlaceholder", language)}
            value={block.videoUrl ?? ""}
            onChange={(event) => onUpdate((current) => ({ ...current, videoUrl: event.target.value }))}
          />
        </label>
        <label>
          {t("admin.blocks.videoPosterUrl", language)}
          <input
            type="text"
            inputMode="url"
            spellCheck={false}
            placeholder={t("admin.blocks.videoPosterPlaceholder", language)}
            value={block.posterUrl ?? ""}
            onChange={(event) => onUpdate((current) => ({
              ...current,
              posterUrl: event.target.value.trim().length > 0 ? event.target.value : undefined
            }))}
          />
        </label>
      </div>

      <p className="admin-muted">{t("admin.blocks.videoAutoplay", language)}</p>

      <div className="admin-post-block__fields">
        <label>
          {t("admin.blocks.captionEn", language)}
          <textarea
            rows={3}
            value={block.content?.en ?? ""}
            onChange={(event) => onUpdate((current) => ({
              ...current,
              content: { ...(current.content ?? { en: "", ru: "" }), en: event.target.value }
            }))}
          />
        </label>
        <label>
          {t("admin.blocks.captionRu", language)}
          <textarea
            rows={3}
            value={block.content?.ru ?? ""}
            onChange={(event) => onUpdate((current) => ({
              ...current,
              content: { ...(current.content ?? { en: "", ru: "" }), ru: event.target.value }
            }))}
          />
        </label>
      </div>
    </div>
  );
}

interface CollageEditorProps {
  block: PortfolioContentBlock;
  disabled: boolean;
  language: Language;
  onCreateImageDataUrl: (file: File) => Promise<string>;
  onUpdate: (updater: (block: PortfolioContentBlock) => PortfolioContentBlock) => void;
}

function CollageEditor({ block, disabled, language, onCreateImageDataUrl, onUpdate }: CollageEditorProps) {
  const images = block.images ?? [];

  async function handleAddImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = await onCreateImageDataUrl(file);
    onUpdate((current) => ({ ...current, images: [...(current.images ?? []), url] }));
    event.target.value = "";
  }

  function handleRemoveImage(index: number) {
    onUpdate((current) => ({
      ...current,
      images: (current.images ?? []).filter((_, i) => i !== index)
    }));
  }

  return (
    <div className="admin-post-block__collage">
      {images.length > 0 ? (
        <div className="admin-post-block__collage-grid">
          {images.map((url, index) => (
            <div key={index} className="admin-post-block__collage-item">
              <img src={url} alt={`Collage ${index + 1}`} loading="lazy" />
              <button
                type="button"
                className="admin-post-block__collage-remove"
                onClick={() => handleRemoveImage(index)}
                disabled={disabled}
              >
                {t("admin.blocks.collageRemove", language)}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="admin-muted">{t("admin.blocks.collageEmpty", language)}</p>
      )}
      <label className="admin-post-block__collage-add">
        {t("admin.blocks.collageAdd", language)}
        <input type="file" accept="image/*" onChange={(event) => void handleAddImage(event)} disabled={disabled} />
      </label>
    </div>
  );
}

export function AdminPostBlocksEditor({
  blocks,
  disabled,
  language,
  onChange,
  onCreateImageDataUrl,
  onUploadVideoFile
}: AdminPostBlocksEditorProps) {
  function insertBlockAt(index: number, type: PortfolioContentBlockType) {
    const next = [...blocks];
    next.splice(index, 0, createBlock(type));
    onChange(next);
  }

  function updateBlock(blockId: string, updater: (block: PortfolioContentBlock) => PortfolioContentBlock) {
    onChange(blocks.map((block) => (block.id === blockId ? updater(block) : block)));
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    const index = blocks.findIndex((block) => block.id === blockId);
    if (index < 0) return;

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;

    const next = [...blocks];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onChange(next);
  }

  async function handleImageSelect(blockId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = await onCreateImageDataUrl(file);
    updateBlock(blockId, (current) => ({ ...current, imageUrl }));
    event.target.value = "";
  }

  return (
    <section className="admin-post-blocks">
      <div className="admin-post-blocks__header">
        <div>
          <strong>{t("admin.blocks.title", language)}</strong>
          <p className="admin-muted">{t("admin.blocks.description", language)}</p>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="admin-post-blocks__empty">
          <BlockInserter disabled={disabled} language={language} onInsert={(type) => insertBlockAt(0, type)} />
          <p className="admin-muted">{t("admin.blocks.empty", language)}</p>
        </div>
      ) : (
        <div className="admin-post-blocks__list">
          <BlockInserter disabled={disabled} language={language} onInsert={(type) => insertBlockAt(0, type)} />

          {blocks.map((block, index) => {
            const isImage = block.type === "image";
            const isVideo = block.type === "video";
            const isCollage = block.type === "collage";
            const isText = !isImage && !isVideo && !isCollage;
            const textHelp = getTextHelp(block.type, language);

            return (
              <div key={block.id} className="admin-post-block__wrap">
                <article className="admin-post-block">
                  <div className="admin-post-block__toolbar">
                    <span className="admin-status-badge admin-status-badge--neutral">{getBlockLabel(block.type, language)}</span>
                    <div className="admin-post-block__toolbar-actions">
                      <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={disabled || index === 0}>{t("admin.blocks.up", language)}</button>
                      <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={disabled || index === blocks.length - 1}>{t("admin.blocks.down", language)}</button>
                      <button type="button" onClick={() => onChange(blocks.filter((item) => item.id !== block.id))} disabled={disabled}>{t("admin.blocks.remove", language)}</button>
                    </div>
                  </div>

                  {isText ? (
                    <div className="admin-post-block__fields">
                      <label>
                        {t("admin.blocks.contentEn", language)}
                        <textarea
                          rows={getTextRows(block.type)}
                          placeholder={block.type === "numberedList" ? "1st item\n2nd item\n3rd item" : undefined}
                          value={block.content?.en ?? ""}
                          onChange={(event) => updateBlock(block.id, (current) => ({
                            ...current,
                            content: { ...(current.content ?? { en: "", ru: "" }), en: event.target.value }
                          }))}
                        />
                      </label>
                      <label>
                        {t("admin.blocks.contentRu", language)}
                        <textarea
                          rows={getTextRows(block.type)}
                          placeholder={block.type === "numberedList" ? "Первый пункт\nВторой пункт\nТретий пункт" : undefined}
                          value={block.content?.ru ?? ""}
                          onChange={(event) => updateBlock(block.id, (current) => ({
                            ...current,
                            content: { ...(current.content ?? { en: "", ru: "" }), ru: event.target.value }
                          }))}
                        />
                      </label>
                      {block.type === "typewriter" ? (
                        <label>
                          {t("admin.blocks.typewriterSpeed", language)}
                          <input
                            type="number"
                            min={20}
                            max={300}
                            step={10}
                            value={block.scrollSpan ?? 80}
                            onChange={(event) => updateBlock(block.id, (current) => ({
                              ...current,
                              scrollSpan: Number(event.target.value) || 80
                            }))}
                          />
                        </label>
                      ) : null}
                      {textHelp ? <p className="admin-muted admin-post-block__hint">{textHelp}</p> : null}
                    </div>
                  ) : isImage ? (
                    <div className="admin-post-block__image">
                      <label>
                        {t("admin.blocks.imageLabel", language)}
                        <input type="file" accept="image/*" onChange={(event) => void handleImageSelect(block.id, event)} />
                      </label>
                      {block.imageUrl ? <img src={block.imageUrl} alt="Post block preview" loading="lazy" /> : <p className="admin-muted">{t("admin.blocks.imageEmpty", language)}</p>}
                    </div>
                  ) : isCollage ? (
                    <CollageEditor
                      block={block}
                      disabled={disabled}
                      language={language}
                      onCreateImageDataUrl={onCreateImageDataUrl}
                      onUpdate={(updater) => updateBlock(block.id, updater)}
                    />
                  ) : (
                    <PostVideoUploadField
                      block={block}
                      disabled={disabled}
                      language={language}
                      onUploadVideoFile={onUploadVideoFile}
                      onUpdate={(updater) => updateBlock(block.id, updater)}
                    />
                  )}
                </article>

                <BlockInserter disabled={disabled} language={language} onInsert={(type) => insertBlockAt(index + 1, type)} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
