import { ProjectCard } from "./ProjectCard";
import { ProjectCardPlaceholder } from "./ProjectCardPlaceholder";
import type { Language, PortfolioProject, ThemeMode } from "../types";

interface ProjectCardGridProps {
  items: PortfolioProject[];
  theme: ThemeMode;
  language: Language;
  expandedId: string | null;
  onExpand: (projectId: string) => void;
  onCollapse: (projectId: string) => void;
  onNavigate: (projectId: string) => void;
  className?: string;
  placeholderCount?: number;
}

export function ProjectCardGrid({
  items,
  theme,
  language,
  expandedId,
  onExpand,
  onCollapse,
  onNavigate,
  className,
  placeholderCount = 0
}: ProjectCardGridProps) {
  const rootClassName = className ? `portfolio-grid ${className}` : "portfolio-grid";

  return (
    <div className={rootClassName} data-gsap="stagger">
      {items.length > 0
        ? items.map((project) => (
            <div key={project.id} className="portfolio-grid__item">
              <ProjectCard
                project={project}
                theme={theme}
                language={language}
                isExpanded={expandedId === project.id}
                onExpand={onExpand}
                onCollapse={() => onCollapse(project.id)}
                onNavigate={onNavigate}
              />
            </div>
          ))
        : Array.from({ length: placeholderCount }).map((_, index) => (
            <div key={`placeholder-${index}`} className="portfolio-grid__item">
              <ProjectCardPlaceholder language={language} />
            </div>
          ))}
    </div>
  );
}