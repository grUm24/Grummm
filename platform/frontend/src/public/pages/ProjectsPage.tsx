import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LiquidGlass } from "../components/LiquidGlass";
import { ProjectCard } from "../components/ProjectCard";
import { SpaceBackground } from "../components/SpaceBackground";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { useProjectPosts } from "../data/project-store";
import { usePreferences } from "../preferences";
import { t } from "../../shared/i18n";

export function ProjectsPage() {
  const navigate = useNavigate();
  const { theme, language } = usePreferences();
  const projects = useProjectPosts();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const canHover = (typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) ?? false;

  useSwipeBack(() => navigate("/"), { enabled: !canHover, edgeOnly: true });

  return (
    <motion.section
      className="projects-page public-surface"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <SpaceBackground />

      <LiquidGlass as="header" className="projects-page__header projects-page__header--card">
        <div>
          <p className="section-heading__eyebrow">{t("projects.eyebrow", language)}</p>
          <h1>{t("projects.title", language)}</h1>
          <p>{t("projects.description", language)}</p>
        </div>
        <div className="projects-page__actions">
          <span className="projects-page__count">{projects.length}</span>
          <button className="inline-back" type="button" onClick={() => navigate("/")}>
            {t("projects.back", language)}
          </button>
        </div>
      </LiquidGlass>

      <section className="portfolio-grid portfolio-grid--catalog">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            theme={theme}
            language={language}
            isExpanded={expandedId === project.id}
            onExpand={setExpandedId}
            onCollapse={() => setExpandedId((current) => (current === project.id ? null : current))}
            onNavigate={(projectId) => navigate(`/projects/${projectId}`)}
          />
        ))}
      </section>
    </motion.section>
  );
}
