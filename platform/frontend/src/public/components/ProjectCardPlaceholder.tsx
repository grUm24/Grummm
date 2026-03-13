import { t } from "../../shared/i18n";
import type { Language } from "../types";

interface ProjectCardPlaceholderProps {
  language: Language;
}

export function ProjectCardPlaceholder({ language }: ProjectCardPlaceholderProps) {
  return (
    <article className="project-card project-card--placeholder" aria-hidden="true">
      <div className="project-card__placeholder-cover" />
      <div className="project-card__body">
        <h3>{t("landing.placeholder.title", language)}</h3>
        <p>{t("landing.placeholder.description", language)}</p>
      </div>
    </article>
  );
}
