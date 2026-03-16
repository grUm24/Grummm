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
  { type: "image", label: "Image" }
];

function createBlock(type: PortfolioContentBlockType): PortfolioContentBlock {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type,
    content: type === "image" ? undefined : { en: "", ru: "" },
    imageUrl: type === "image" ? "" : undefined
  };
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
          <p className="admin-muted">Build the post from localized blocks. Add paragraphs, subheadings, and images after the summary.</p>
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
          <p className="admin-muted">Use the plus button to add the first paragraph, subheading, or image.</p>
        </div>
      ) : (
        <div className="admin-post-blocks__list">
          {blocks.map((block, index) => {
            const isText = block.type !== "image";
            return (
              <article key={block.id} className="admin-post-block">
                <div className="admin-post-block__toolbar">
                  <span className="admin-status-badge admin-status-badge--neutral">{block.type}</span>
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
                        rows={block.type === "subheading" ? 2 : 5}
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
                        rows={block.type === "subheading" ? 2 : 5}
                        value={block.content?.ru ?? ""}
                        onChange={(event) => updateBlock(block.id, (current) => ({
                          ...current,
                          content: { ...(current.content ?? { en: "", ru: "" }), ru: event.target.value }
                        }))}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="admin-post-block__image">
                    <label>
                      Image file
                      <input type="file" accept="image/*" onChange={(event) => void handleImageSelect(block.id, event)} />
                    </label>
                    {block.imageUrl ? <img src={block.imageUrl} alt="Post block preview" loading="lazy" /> : <p className="admin-muted">Upload one image for this block.</p>}
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