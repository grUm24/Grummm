import { ParagraphText } from "./ParagraphText";
import { PostVideoBlock } from "./PostVideoBlock";
import { ProgressiveImage } from "./ProgressiveImage";
import { TypewriterText } from "./TypewriterText";
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
  const localizedTitle = project.title[language] || project.title.en || project.id;
  const localizedSummary = project.summary[language] || project.summary.en || project.description[language] || project.description.en;

  return (
    <section className="post-content liquid-glass" data-gsap="reveal" aria-labelledby={`post-content-title-${project.id}`}>
      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />
      <div className="liquid-glass__content post-content__shell">
        <div className="post-content__cover">
          <ProgressiveImage
            src={project.heroImage[theme]}
            alt={localizedTitle}
            loading="eager"
            itemProp="image"
            wrapperClassName="post-content__cover-frame"
          />
        </div>

        <div className="post-content__body" itemProp="articleBody">
          <header className="post-content__intro">
            <h2 id={`post-content-title-${project.id}`} className="sr-only">{localizedTitle}</h2>
            <p className="sr-only">{localizedSummary}</p>
          </header>

          {hasBlocks ? blocks.map((block, index) => {
            if (block.type === "image" && block.imageUrl) {
              return (
                <figure key={block.id} className="post-content__block post-content__block--image post-content__figure" data-gsap-post-block>
                  <ProgressiveImage
                    src={block.imageUrl}
                    alt={`${localizedTitle} - image ${index + 1}`}
                    loading="lazy"
                    wrapperClassName="post-content__figure-frame"
                  />
                </figure>
              );
            }

            if (block.type === "collage" && block.images && block.images.length > 0) {
              const count = block.images.length;
              const layoutClass = count <= 2 ? "cols-2" : count <= 4 ? "cols-2" : "cols-3";
              return (
                <div key={block.id} className={`post-content__block post-content__block--collage post-content__collage post-content__collage--${layoutClass}`} data-gsap-post-block>
                  {block.images.map((url, imgIndex) => (
                    <figure key={`${block.id}-${imgIndex}`} className="post-content__collage-item">
                      <ProgressiveImage
                        src={url}
                        alt={`${localizedTitle} - collage ${imgIndex + 1}`}
                        loading="lazy"
                        wrapperClassName="post-content__collage-frame"
                      />
                    </figure>
                  ))}
                </div>
              );
            }

            if (block.type === "video" && block.videoUrl) {
              return (
                <PostVideoBlock
                  key={block.id}
                  block={block}
                  language={language}
                  title={localizedTitle}
                />
              );
            }

            const value = block.content?.[language] || block.content?.en || block.content?.ru || "";
            if (!value.trim()) {
              return null;
            }

            if (block.type === "typewriter") {
              return (
                <div key={block.id} className="post-content__block post-content__block--typewriter" data-gsap-post-block>
                  <TypewriterText text={value} speed={block.scrollSpan ?? 80} className="post-content__typewriter" />
                </div>
              );
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
                    {items.map((item, itemIndex) => (
                      <li key={`${block.id}-${itemIndex}`} className="post-content__ordered-item">
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

          {publishedMeta && project.publishedAt ? (
            <div className="post-content__block post-content__meta-row" data-gsap-post-block>
              <time className="post-content__published-at" dateTime={project.publishedAt}>
                {publishedMeta}
              </time>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
