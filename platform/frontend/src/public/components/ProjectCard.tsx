import { useMemo, useRef, type PointerEvent } from "react";
import { motion } from "framer-motion";
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

function applyPointerState(element: HTMLElement, clientX: number, clientY: number) {
  const rect = element.getBoundingClientRect();
  const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
  const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
  const xRatio = rect.width > 0 ? x / rect.width : 0.5;
  const yRatio = rect.height > 0 ? y / rect.height : 0.5;
  const rotateY = (xRatio - 0.5) * 4;
  const rotateX = (yRatio - 0.5) * -4;

  element.dataset.tracking = "true";
  element.style.setProperty("--glass-x", `${(xRatio * 100).toFixed(2)}%`);
  element.style.setProperty("--glass-y", `${(yRatio * 100).toFixed(2)}%`);
  element.style.setProperty("--glass-rx", `${rotateX.toFixed(2)}deg`);
  element.style.setProperty("--glass-ry", `${rotateY.toFixed(2)}deg`);
  element.style.setProperty("--glass-active", "1");
}

function resetPointerState(element: HTMLElement) {
  delete element.dataset.tracking;
  element.style.setProperty("--glass-rx", "0deg");
  element.style.setProperty("--glass-ry", "0deg");
  element.style.setProperty("--glass-active", "0");
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
    () => (typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) ?? false,
    []
  );

  const title = project.title[language];
  const summary = project.summary[language];
  const description = project.description[language];
  const cover = project.heroImage[theme];
  const isTouchExpanded = !canHover && isExpanded;
  const marqueeTags = project.tags.length > 0 ? [...project.tags, ...project.tags] : [];
  const eyebrow = project.template && project.template !== "None" ? project.template : t("project.card.showcase", language);

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

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    applyPointerState(event.currentTarget, event.clientX, event.clientY);
  }

  function handlePointerLeave(event: PointerEvent<HTMLElement>) {
    resetPointerState(event.currentTarget);
    if (!canHover) {
      onCollapse();
    }
  }

  return (
    <motion.article
      className={`project-card liquid-glass project-card--liquid${isTouchExpanded ? " project-card--expanded" : ""}`}
      onMouseLeave={canHover ? handlePointerLeave : undefined}
      onPointerMove={canHover ? handlePointerMove : undefined}
      onPointerEnter={canHover ? handlePointerMove : undefined}
      onClick={handleClick}
      whileHover={canHover ? { y: -4 } : undefined}
      whileTap={{ scale: 0.988 }}
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
      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />
      <div className="liquid-glass__content project-card__shell">
        <div className="project-card__media">
          <img src={cover} alt={title} loading="lazy" />
        </div>
        <div className="project-card__body">
          <div className="project-card__copy">
            <p className="project-card__eyebrow">{eyebrow}</p>
            <h3>{title}</h3>
            <p className="project-card__summary">{summary}</p>
          </div>

          {marqueeTags.length > 0 ? (
            <div className="project-card__tag-marquee" aria-hidden="true">
              <div className="project-card__tag-track">
                {marqueeTags.map((tag, index) => (
                  <span key={`${project.id}-${tag}-${index}`} className="project-card__tag-pill">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className={`project-card__details${isTouchExpanded ? " is-open" : ""}`}>
            <ParagraphText text={description} className="project-card__detail-paragraph" />
            {!canHover ? (
              <strong>{t("project.card.tapAgain", language)}</strong>
            ) : null}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
