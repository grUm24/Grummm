import { useState, type ChangeEvent } from "react";
import type { PortfolioContentBlock, PortfolioContentBlockType } from "../../public/types";

interface AdminPostBlocksEditorProps {
  blocks: PortfolioContentBlock[];
  disabled: boolean;
  onChange: (blocks: PortfolioContentBlock[]) => void;
  onCreateImageDataUrl: (file: File) => Promise<string>;
}

const BLOCK_OPTIONS: Array<{ type: PortfolioContentBlockType; label: string }> = [
  { type: "paragraph", label: "Paragraph" },
  { type: "subheading", label: "Subheading" },
  { type: "callout", label: "Callout" },
  { type: "numberedList", label: "Numbered list" },
  { type: "image", label: "Image" },
  { type: "video", label: "Video" }
];

function getBlockLabel(type: PortfolioContentBlockType): string {
  return BLOCK_OPTIONS.find((option) => option.type === type)?.label ?? type;
}

function createBlock(type: PortfolioContentBlockType): PortfolioContentBlock {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type,
    content: type === "image" ? undefined : { en: "", ru: "" },
    imageUrl: type === "image" ? "" : undefined,
    videoUrl: type === "video" ? "" : undefined,
    posterUrl: type === "video" ? "" : undefined,
    pinEnabled: type === "video" ? true : undefined,
    scrollSpan: type === "video" ? 160 : undefined
  };
}

function getTextRows(type: PortfolioContentBlockType): number {
  if (type === "subheading") {
    return 2;
  }

  if (type === "callout") {
    return 4;
  }

  if (type === "numberedList") {
    return 6;
  }

  return 5;
}

function getTextHelp(type: PortfolioContentBlockType): string | null {
  if (type === "numberedList") {
    return "Each new line becomes the next numbered item.";
  }

  if (type === "callout") {
    return "Use this for a highlighted editorial statement or pull-quote.";
  }

  return null;
}

export function AdminPostBlocksEditor({ blocks, disabled, onChange, onCreateImageDataUrl }: AdminPostBlocksEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function appendBlock(type: PortfolioContentBlockType) {
    onChange([...blocks, createBlock(type)]);
    setPickerOpen(false);
  }

  function updateBlock(blockId: string, updater: (block: PortfolioContentBlock) => PortfolioContentBlock) {
    onChange(blocks.map((block) => (block.id === blockId ? updater(block) : block)));
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    const index = blocks.findIndex((block) => block.id === blockId);
    if (index < 0) {
      return;
    }

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blocks.length) {
      return;
    }

    const next = [...blocks];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onChange(next);
  }

  async function handleImageSelect(blockId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const imageUrl = await onCreateImageDataUrl(file);
    updateBlock(blockId, (block) => ({ ...block, imageUrl }));
    event.target.value = "";
  }

  return (
    <section className="admin-post-blocks">
      <div className="admin-post-blocks__header">
        <div>
          <strong>Post body</strong>
          <p className="admin-muted">Build the post from localized blocks. Add paragraphs, subheadings, callouts, numbered lists, images, and CDN-hosted MP4 scenes after the summary.</p>
        </div>

        <div className="admin-post-blocks__actions">
          {pickerOpen ? (
            <div className="admin-post-blocks__picker" role="listbox" aria-label="Add post block">
              {BLOCK_OPTIONS.map((option) => (
                <button key={option.type} type="button" onClick={() => appendBlock(option.type)} disabled={disabled}>
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          <button type="button" className="admin-post-blocks__add" onClick={() => setPickerOpen((value) => !value)} disabled={disabled}>
            +
          </button>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="admin-post-blocks__empty">
          <strong>No blocks yet</strong>
          <p className="admin-muted">Use the plus button to add the first paragraph, subheading, callout, numbered list, image, or video scene.</p>
        </div>
      ) : (
        <div className="admin-post-blocks__list">
          {blocks.map((block, index) => {
            const isImage = block.type === "image";
            const isVideo = block.type === "video";
            const isText = !isImage && !isVideo;
            const textHelp = getTextHelp(block.type);

            return (
              <article key={block.id} className="admin-post-block">
                <div className="admin-post-block__toolbar">
                  <span className="admin-status-badge admin-status-badge--neutral">{getBlockLabel(block.type)}</span>
                  <div className="admin-post-block__toolbar-actions">
                    <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={disabled || index === 0}>Up</button>
                    <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={disabled || index === blocks.length - 1}>Down</button>
                    <button type="button" onClick={() => onChange(blocks.filter((item) => item.id !== block.id))} disabled={disabled}>Remove</button>
                  </div>
                </div>

                {isText ? (
                  <div className="admin-post-block__fields">
                    <label>
                      Content (EN)
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
                      Content (RU)
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
                    {textHelp ? <p className="admin-muted admin-post-block__hint">{textHelp}</p> : null}
                  </div>
                ) : isImage ? (
                  <div className="admin-post-block__image">
                    <label>
                      Image or GIF
                      <input type="file" accept="image/*" onChange={(event) => void handleImageSelect(block.id, event)} />
                    </label>
                    {block.imageUrl ? <img src={block.imageUrl} alt="Post block preview" loading="lazy" /> : <p className="admin-muted">Upload one static image or animated GIF for this block.</p>}
                  </div>
                ) : (
                  <div className="admin-post-block__video">
                    <div className="admin-post-block__fields">
                      <label>
                        MP4 URL
                        <input
                          type="url"
                          placeholder="https://cdn.example.com/post-scene.mp4"
                          value={block.videoUrl ?? ""}
                          onChange={(event) => updateBlock(block.id, (current) => ({
                            ...current,
                            videoUrl: event.target.value
                          }))}
                        />
                      </label>
                      <label>
                        Poster URL
                        <input
                          type="url"
                          placeholder="https://cdn.example.com/post-scene-poster.jpg"
                          value={block.posterUrl ?? ""}
                          onChange={(event) => updateBlock(block.id, (current) => ({
                            ...current,
                            posterUrl: event.target.value
                          }))}
                        />
                      </label>
                    </div>

                    <div className="admin-post-block__video-settings">
                      <label className="admin-toggle admin-toggle--inline">
                        <input
                          type="checkbox"
                          checked={block.pinEnabled ?? false}
                          onChange={(event) => updateBlock(block.id, (current) => ({
                            ...current,
                            pinEnabled: event.target.checked,
                            scrollSpan: event.target.checked ? current.scrollSpan ?? 160 : undefined
                          }))}
                        />
                        <span>Pin and sync playback with scroll on desktop</span>
                      </label>

                      <label>
                        Scroll span (vh)
                        <input
                          type="number"
                          min={80}
                          max={320}
                          step={10}
                          value={block.scrollSpan ?? 160}
                          disabled={disabled || !(block.pinEnabled ?? false)}
                          onChange={(event) => updateBlock(block.id, (current) => ({
                            ...current,
                            scrollSpan: Math.min(320, Math.max(80, Number(event.target.value) || 160))
                          }))}
                        />
                      </label>
                    </div>

                    <div className="admin-post-block__fields">
                      <label>
                        Caption (EN)
                        <textarea
                          rows={3}
                          value={block.content?.en ?? ""}
                          onChange={(event) => updateBlock(block.id, (current) => ({
                            ...current,
                            content: { ...(current.content ?? { en: "", ru: "" }), en: event.target.value }
                          }))}
                        />
                      </label>
                      <label>
                        Caption (RU)
                        <textarea
                          rows={3}
                          value={block.content?.ru ?? ""}
                          onChange={(event) => updateBlock(block.id, (current) => ({
                            ...current,
                            content: { ...(current.content ?? { en: "", ru: "" }), ru: event.target.value }
                          }))}
                        />
                      </label>
                    </div>

                    <p className="admin-muted">Use CDN links only. Static MP4 with optional poster keeps the editor lightweight and avoids uploading heavy video files into the platform.</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
