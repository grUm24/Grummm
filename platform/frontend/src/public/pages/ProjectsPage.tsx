import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ProjectCard } from "../components/ProjectCard";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { portfolioProjects } from "../data/projects";
import { usePreferences } from "../preferences";

export function ProjectsPage() {
  const navigate = useNavigate();
  const { theme, language } = usePreferences();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const canHover = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? false;

  useSwipeBack(() => navigate("/"), { enabled: !canHover, edgeOnly: true });

  return (
    <motion.section
      className="projects-page"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <header className="projects-page__header projects-page__header--card">
        <div className="projects-page__header-row">
          <h1>{language === "ru" ? "Портфолио модулей" : "Module Portfolio"}</h1>
          <button className="inline-back" type="button" onClick={() => navigate("/")}>
            {language === "ru" ? "На главную" : "Back home"}
          </button>
        </div>
        <p>
          {language === "ru"
            ? "На ПК карточка расширяется по наведению. На телефоне: первый тап раскрывает, второй открывает страницу."
            : "On desktop cards expand on hover. On phone first tap expands, second tap opens the page."}
        </p>
      </header>

      <section className="portfolio-grid">
        {portfolioProjects.map((project) => (
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
