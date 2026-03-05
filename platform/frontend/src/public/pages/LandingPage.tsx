import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ProjectCard } from "../components/ProjectCard";
import { ParagraphText } from "../components/ParagraphText";
import { RotatingEarth } from "../components/RotatingEarth";
import { SpaceBackground } from "../components/SpaceBackground";
import { useLandingContent } from "../data/landing-content-store";
import { useProjectPosts } from "../data/project-store";
import type { PortfolioProject } from "../types";
import { usePreferences } from "../preferences";

export function LandingPage() {
  const navigate = useNavigate();
  const { theme, language, toggleTheme, setLanguage } = usePreferences();
  const projects = useProjectPosts();
  const landingContent = useLandingContent();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const featuredPosts = projects
    .filter((item) => (item.template ?? "None") === "None")
    .slice(0, 3);
  const featuredProjects = projects
    .filter((item) => (item.template ?? "None") !== "None")
    .slice(0, 3);

  function renderCards(items: PortfolioProject[]) {
    return items.map((project) => (
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
    ));
  }

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
          <p className="hero__eyebrow">{landingContent.heroEyebrow[language]}</p>
          <h1>{landingContent.heroTitle[language]}</h1>
          <p>{landingContent.heroDescription[language]}</p>
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
        {featuredPosts.length > 0 ? (
          <>
            <h2 className="portfolio-grid-wrap__title">{language === "ru" ? "Посты" : "Posts"}</h2>
            <div className="portfolio-grid">{renderCards(featuredPosts)}</div>
          </>
        ) : null}
        {featuredProjects.length > 0 ? (
          <>
            <h2 className="portfolio-grid-wrap__title">{language === "ru" ? "Проекты" : "Projects"}</h2>
            <div className="portfolio-grid">{renderCards(featuredProjects)}</div>
          </>
        ) : null}
      </section>

      <motion.section
        className="landing-about"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, delay: 0.08 }}
      >
        <div className="landing-about__photo-wrap">
          {landingContent.aboutPhoto ? (
            <img className="landing-about__photo" src={landingContent.aboutPhoto} alt="Profile" />
          ) : (
            <div className="landing-about__photo landing-about__photo--placeholder">
              {language === "ru" ? "Ваше фото" : "Your photo"}
            </div>
          )}
        </div>
        <div className="landing-about__content">
          <h2>{landingContent.aboutTitle[language]}</h2>
          <p>{landingContent.aboutText[language]}</p>
          <h3>{landingContent.portfolioTitle[language]}</h3>
          <ParagraphText text={landingContent.portfolioText[language]} className="landing-about__paragraph" />
        </div>
      </motion.section>
    </section>
  );
}
