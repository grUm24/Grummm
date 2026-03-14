import { createPortal } from "react-dom";
import { LiquidGlass } from "./LiquidGlass";
import { ProjectPreviewCard } from "./ProjectPreviewCard";
import { t } from "../../shared/i18n";
import type { Language, PortfolioProject, ThemeMode } from "../types";

interface ProjectPopupProps {
  project: PortfolioProject | null;
  language: Language;
  theme: ThemeMode;
  modal?: boolean;
  onClose: () => void;
  onNavigate: (projectId: string) => void;
}

export function ProjectPopup({ project, language, theme, modal = true, onClose, onNavigate }: ProjectPopupProps) {
  const popupRoot = document.body;
  if (!project) return null;

  return createPortal(
    modal ? (
      <div className="project-popup-overlay" key={project.id} onClick={onClose}>
        <div className="project-popup__frame">
          <LiquidGlass as="div" className="project-popup project-popup--modal" onClick={(event) => event.stopPropagation()}>
            <ProjectPreviewCard
              project={project}
              language={language}
              theme={theme}
              actionLabel={t("project.popup.open", language)}
              onAction={() => onNavigate(project.id)}
            />
          </LiquidGlass>
        </div>
      </div>
    ) : (
      <div className="project-popup__floating-frame" key={project.id}>
        <LiquidGlass as="aside" className="project-popup project-popup--floating" aria-hidden>
          <ProjectPreviewCard project={project} language={language} theme={theme} eyebrow="Preview" />
        </LiquidGlass>
      </div>
    ),
    popupRoot
  );
}