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
    <div className={rootClassName}>
      {items.length > 0
        ? items.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              theme={theme}
              language={language}
              isExpanded={expandedId === project.id}
              onExpand={onExpand}
              onCollapse={() => onCollapse(project.id)}
              onNavigate={onNavigate}
            />
          ))
        : Array.from({ length: placeholderCount }).map((_, index) => (
            <ProjectCardPlaceholder key={`placeholder-${index}`} language={language} />
          ))}
    </div>
  );
}
