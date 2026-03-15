import { useRef } from "react";
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

function getInteractionHint(language: Language): string {
  return language === "ru"
    ? "Первое нажатие раскрывает больше контекста"
    : "First tap opens more context";
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

  const title = project.title[language];
  const summary = project.summary[language];
  const description = project.description[language];
  const cover = project.heroImage[theme];
  const eyebrow = project.template && project.template !== "None" ? project.template : t("project.card.showcase", language);
  const interactionHint = getInteractionHint(language);

  function handleClick() {
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
      className={`project-card liquid-glass${isExpanded ? " project-card--expanded" : ""}`}
      data-gsap-button
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (isExpanded) {
            onNavigate(project.id);
          } else {
            onExpand(project.id);
          }
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
          </div>

          <div className="project-card__text">
            <h3 title={title}>{title}</h3>
            <p className="project-card__summary" title={summary}>{summary}</p>
          </div>

          {project.tags.length > 0 ? (
            <div className="project-card__tags-marquee" aria-label={t("landing.hero.highlights", language)}>
              <div className="project-card__tags-track">
                {[...project.tags, ...project.tags].map((tag, index) => (
                  <span key={`${project.id}-${tag}-${index}`} className="project-card__tag-pill">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <p className="project-card__interaction-hint">{interactionHint}</p>

          <div className={`project-card__details${isExpanded ? " is-open" : ""}`}>
            <ParagraphText text={description} className="project-card__detail-paragraph" />
          </div>
        </div>
      </div>
    </article>
  );
}
