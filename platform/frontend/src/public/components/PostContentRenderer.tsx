import { ParagraphText } from "./ParagraphText";
import { PostVideoBlock } from "./PostVideoBlock";
import { formatPublishedMeta } from "../formatPublishedDate";
import type { Language, PortfolioProject, ThemeMode } from "../types";

interface PostContentRendererProps {
  project: PortfolioProject;
  language: Language;
  theme: ThemeMode;
}

function toListItems(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((item) => item.replace(/^\s*\d+[.)-]?\s*/, "").trim())
    .filter((item) => item.length > 0);
}

export function PostContentRenderer({ project, language, theme }: PostContentRendererProps) {
  const blocks = project.contentBlocks ?? [];
  const hasBlocks = blocks.length > 0;
  const publishedMeta = formatPublishedMeta(project.publishedAt, language);

  return (
    <section className="post-content liquid-glass" data-gsap="reveal">
      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />
      <div className="liquid-glass__content post-content__shell">
        <div className="post-content__cover">
          <img src={project.heroImage[theme]} alt={project.title[language]} loading="lazy" />
        </div>

        <div className="post-content__body">
          {hasBlocks ? blocks.map((block) => {
            if (block.type === "image" && block.imageUrl) {
              return (
                <figure key={block.id} className="post-content__block post-content__block--image post-content__figure" data-gsap-post-block>
                  <img src={block.imageUrl} alt="Post block" loading="lazy" />
                </figure>
              );
            }

            if (block.type === "video" && block.videoUrl) {
              return (
                <PostVideoBlock
                  key={block.id}
                  block={block}
                  language={language}
                  title={project.title[language] || project.title.en || project.id}
                />
              );
            }

            const value = block.content?.[language] || block.content?.en || block.content?.ru || "";
            if (!value.trim()) {
              return null;
            }

            if (block.type === "subheading") {
              return (
                <div key={block.id} className="post-content__block post-content__block--subheading" data-gsap-post-block>
                  <h2 className="post-content__subheading">{value}</h2>
                </div>
              );
            }

            if (block.type === "numberedList") {
              const items = toListItems(value);
              if (items.length === 0) {
                return null;
              }

              return (
                <div key={block.id} className="post-content__block post-content__block--numbered-list" data-gsap-post-block>
                  <ol className="post-content__ordered-list">
                    {items.map((item, index) => (
                      <li key={`${block.id}-${index}`} className="post-content__ordered-item">
                        <ParagraphText text={item} className="post-content__ordered-copy" />
                      </li>
                    ))}
                  </ol>
                </div>
              );
            }

            if (block.type === "callout") {
              return (
                <div key={block.id} className="post-content__block post-content__block--callout" data-gsap-post-block>
                  <blockquote className="post-content__callout">
                    <ParagraphText text={value} className="post-content__callout-text" />
                  </blockquote>
                </div>
              );
            }

            return (
              <div key={block.id} className="post-content__block post-content__block--paragraph" data-gsap-post-block>
                <ParagraphText text={value} className="post-content__paragraph" />
              </div>
            );
          }) : (
            <div className="post-content__block post-content__block--paragraph" data-gsap-post-block>
              <ParagraphText text={project.description[language]} className="post-content__paragraph" />
            </div>
          )}
          {publishedMeta ? (
            <div className="post-content__block post-content__meta-row" data-gsap-post-block>
              <p className="post-content__published-at">{publishedMeta}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
