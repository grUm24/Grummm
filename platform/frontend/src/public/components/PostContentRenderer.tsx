import { ParagraphText } from "./ParagraphText";
import type { Language, PortfolioProject, ThemeMode } from "../types";

interface PostContentRendererProps {
  project: PortfolioProject;
  language: Language;
  theme: ThemeMode;
}

export function PostContentRenderer({ project, language, theme }: PostContentRendererProps) {
  const blocks = project.contentBlocks ?? [];
  const hasBlocks = blocks.length > 0;

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
                <figure key={block.id} className="post-content__figure">
                  <img src={block.imageUrl} alt="Post block" loading="lazy" />
                </figure>
              );
            }

            const value = block.content?.[language] || block.content?.en || block.content?.ru || "";
            if (!value.trim()) {
              return null;
            }

            if (block.type === "subheading") {
              return <h2 key={block.id} className="post-content__subheading">{value}</h2>;
            }

            return <ParagraphText key={block.id} text={value} className="post-content__paragraph" />;
          }) : <ParagraphText text={project.description[language]} className="post-content__paragraph" />}
        </div>
      </div>
    </section>
  );
}