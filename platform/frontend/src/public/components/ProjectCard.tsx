import { useMemo, useRef } from "react";
import { ParagraphText } from "./ParagraphText";
import { t } from "../../shared/i18n";
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
  onCollapse: _onCollapse,
  onNavigate
}: ProjectCardProps) {
  const lastTapRef = useRef<number>(0);
  const canHover = useMemo(
    () => (typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) ?? false,
    []
  );

  const title = project.title[language];
  const summary = project.summary[language];
  const description = project.description[language];
  const cover = project.heroImage[theme];
  const eyebrow = project.template && project.template !== "None" ? project.template : t("project.card.showcase", language);
  const isTouchExpanded = !canHover && isExpanded;

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
    <article
      className={`project-card liquid-glass${isTouchExpanded ? " project-card--expanded" : ""}`}
      data-gsap-button
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-expanded={!canHover ? isTouchExpanded : undefined}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onNavigate(project.id);
        }
      }}
      aria-label={title}
    >
      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />
      <div className="liquid-glass__content project-card__shell">
        <div className="project-card__media">
          <img src={cover} alt={title} loading="lazy" />
        </div>

        <div className="project-card__content">
          <div className="project-card__meta">
            <p className="project-card__eyebrow">{eyebrow}</p>
            <span className="project-card__icon" aria-hidden="true">?</span>
          </div>

          <div className="project-card__text">
            <h3>{title}</h3>
            <p className="project-card__summary">{summary}</p>
          </div>

          {project.tags.length > 0 ? (
            <div className="project-card__tags">
              {project.tags.map((tag) => (
                <span key={`${project.id}-${tag}`} className="project-card__tag-pill">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {!canHover && isTouchExpanded ? (
            <p className="project-card__touch-hint">{t("project.card.tapAgain", language)}</p>
          ) : null}

          <div className={`project-card__details${isTouchExpanded ? " is-open" : ""}`}>
            <ParagraphText text={description} className="project-card__detail-paragraph" />
          </div>
        </div>
      </div>
    </article>
  );
}