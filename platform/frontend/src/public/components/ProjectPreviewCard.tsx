import { t } from "../../shared/i18n";
import type { Language, PortfolioProject, ThemeMode } from "../types";

interface ProjectPreviewCardProps {
  project: PortfolioProject;
  language: Language;
  theme: ThemeMode;
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ProjectPreviewCard({
  project,
  language,
  theme,
  eyebrow,
  actionLabel,
  onAction
}: ProjectPreviewCardProps) {
  const resolvedEyebrow = eyebrow ?? (project.template && project.template !== "None" ? project.template : t("project.card.showcase", language));

  return (
    <>
      <img src={project.heroImage[theme]} alt={project.title[language]} loading="lazy" />
      <div className="project-popup__body">
        <p className="project-card__eyebrow">{resolvedEyebrow}</p>
        <h3>{project.title[language]}</h3>
        <p>{project.summary[language]}</p>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </>
  );
}
