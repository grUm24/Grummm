import { ProjectCardGrid } from "./ProjectCardGrid";
import { SectionHeading } from "./SectionHeading";
import type { Language, PortfolioProject, ThemeMode } from "../types";

interface PortfolioSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  items: PortfolioProject[];
  theme: ThemeMode;
  language: Language;
  expandedId: string | null;
  onExpand: (projectId: string) => void;
  onCollapse: (projectId: string) => void;
  onNavigate: (projectId: string) => void;
  placeholderCount?: number;
}

export function PortfolioSection({
  eyebrow,
  title,
  description,
  items,
  theme,
  language,
  expandedId,
  onExpand,
  onCollapse,
  onNavigate,
  placeholderCount = 0
}: PortfolioSectionProps) {
  return (
    <section className="portfolio-section section-block" data-gsap="reveal">
      <div className="portfolio-section__intro">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          className="portfolio-section__heading"
          titleClassName="portfolio-section__title"
        />
      </div>

      <div className="portfolio-section__grid">
        <ProjectCardGrid
          items={items}
          theme={theme}
          language={language}
          expandedId={expandedId}
          onExpand={onExpand}
          onCollapse={onCollapse}
          onNavigate={onNavigate}
          placeholderCount={placeholderCount}
        />
      </div>
    </section>
  );
}