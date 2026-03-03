import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ProjectCard } from "../components/ProjectCard";
import { RotatingEarth } from "../components/RotatingEarth";
import { SpaceBackground } from "../components/SpaceBackground";
import { portfolioProjects } from "../data/projects";
import { usePreferences } from "../preferences";

export function LandingPage() {
  const navigate = useNavigate();
  const { theme, language, toggleTheme, setLanguage } = usePreferences();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const featured = portfolioProjects.slice(0, 3);

  return (
    <section className="landing">
      <SpaceBackground />

      <motion.section
        className="hero"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="hero__content">
          <p className="hero__eyebrow">Grummm Platform</p>
          <h1>
            {language === "ru"
              ? "Чистый минимализм. Живая витрина модулей."
              : "Minimal shell. Living module portfolio."}
          </h1>
          <p>
            {language === "ru"
              ? "Landing показывает проекты, тему и язык в реальном времени, сохраняя строгие архитектурные границы платформы."
              : "The landing presents projects, theme and language in real-time while preserving strict architecture boundaries."}
          </p>
          <div className="hero__actions">
            <button type="button" onClick={toggleTheme}>
              {theme === "dark"
                ? language === "ru"
                  ? "Светлая тема"
                  : "Light mode"
                : language === "ru"
                  ? "Тёмная тема"
                  : "Dark mode"}
            </button>
            <button type="button" onClick={() => setLanguage(language === "ru" ? "en" : "ru")}>
              {language === "ru" ? "Switch to EN" : "Переключить на RU"}
            </button>
            <button type="button" onClick={() => navigate("/projects")}>
              {language === "ru" ? "Все проекты" : "All projects"}
            </button>
          </div>
        </div>
        <RotatingEarth />
      </motion.section>

      <section className="portfolio-grid-wrap">
        <div className="portfolio-grid">
          {featured.map((project) => (
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
        </div>
      </section>
    </section>
  );
}
