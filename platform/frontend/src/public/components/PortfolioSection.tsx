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
    <section className="section-block">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        titleClassName="portfolio-grid-wrap__title"
        hideEyebrowVisually
        hideDescriptionVisually
      />
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
    </section>
  );
}