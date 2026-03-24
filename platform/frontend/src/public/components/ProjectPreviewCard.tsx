import { t } from "../../shared/i18n";
import { getPortfolioKind } from "../data/project-store";
import type { Language, PortfolioProject, ThemeMode } from "../types";
import { ProgressiveImage } from "./ProgressiveImage";

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
  const kind = getPortfolioKind(project);
  const resolvedEyebrow = eyebrow ?? (kind === "project"
    ? project.template && project.template !== "None" ? project.template : t("project.card.project", language)
    : t("project.card.showcase", language));

  return (
    <>
      <ProgressiveImage
        src={project.heroImage[theme]}
        alt={project.title[language]}
        loading="lazy"
        wrapperClassName="project-popup__media"
      />
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
