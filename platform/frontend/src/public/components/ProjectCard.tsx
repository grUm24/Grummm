import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import type { Language, PortfolioProject, ThemeMode } from "../types";

interface ProjectCardProps {
  project: PortfolioProject;
  theme: ThemeMode;
  language: Language;
  isExpanded: boolean;
  onExpand: (projectId: string) => void;
  onCollapse: () => void;
  onNavigate: (projectId: string) => void;
}

export function ProjectCard({
  project,
  theme,
  language,
  isExpanded,
  onExpand,
  onCollapse,
  onNavigate
}: ProjectCardProps) {
  const lastTapRef = useRef<number>(0);
  const canHover = useMemo(
    () => window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? false,
    []
  );

  const title = project.title[language];
  const summary = project.summary[language];
  const description = project.description[language];
  const cover = project.heroImage[theme];

  function handleClick() {
    if (canHover) {
      onNavigate(project.id);
      return;
    }

    if (isExpanded) {
      lastTapRef.current = 0;
      onNavigate(project.id);
      return;
    }

    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      onNavigate(project.id);
      lastTapRef.current = 0;
      return;
    }

    lastTapRef.current = now;
    onExpand(project.id);
  }

  return (
    <motion.article
      className={`project-card${isExpanded ? " project-card--expanded" : ""}`}
      onMouseEnter={canHover ? () => onExpand(project.id) : undefined}
      onMouseLeave={canHover ? onCollapse : undefined}
      onFocus={canHover ? () => onExpand(project.id) : undefined}
      onBlur={canHover ? onCollapse : undefined}
      onClick={handleClick}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      layout
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onNavigate(project.id);
        }
      }}
      aria-label={title}
    >
      <img src={cover} alt={title} loading="lazy" />
      <div className="project-card__body">
        <h3>{title}</h3>
        <p>{summary}</p>
        <ul>
          {project.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
        <div className={`project-card__details${isExpanded ? " is-open" : ""}`}>
          <p>{description}</p>
          <strong>{language === "ru" ? "Повторный тап откроет страницу" : "Tap once more to open"}</strong>
        </div>
      </div>
    </motion.article>
  );
}
