import { AnimatePresence, motion } from "framer-motion";
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
    <AnimatePresence mode="wait">
      {modal ? (
        <motion.div className="project-popup-overlay" key={project.id} onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 8 }} transition={{ duration: 0.22 }}>
            <LiquidGlass as="div" className="project-popup project-popup--modal" onClick={(event) => event.stopPropagation()}>
              <ProjectPreviewCard
                project={project}
                language={language}
                theme={theme}
                actionLabel={t("project.popup.open", language)}
                onAction={() => onNavigate(project.id)}
              />
            </LiquidGlass>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div key={project.id} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.99 }} transition={{ duration: 0.2 }}>
          <LiquidGlass as="aside" className="project-popup project-popup--floating" aria-hidden>
            <ProjectPreviewCard project={project} language={language} theme={theme} eyebrow="Preview" />
          </LiquidGlass>
        </motion.div>
      )}
    </AnimatePresence>,
    popupRoot
  );
}
