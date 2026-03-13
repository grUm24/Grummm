import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LiquidGlass } from "../components/LiquidGlass";
import { ProjectCard } from "../components/ProjectCard";
import { ParagraphText } from "../components/ParagraphText";
import { RotatingEarth } from "../components/RotatingEarth";
import { SpaceBackground } from "../components/SpaceBackground";
import { useLandingContent } from "../data/landing-content-store";
import { useProjectPosts } from "../data/project-store";
import type { PortfolioProject } from "../types";
import { usePreferences } from "../preferences";
import { t } from "../../shared/i18n";

function fallback(value: string | undefined, next: string): string {
  return value && value.trim().length > 0 ? value : next;
}

export function LandingPage() {
  const navigate = useNavigate();
  const { theme, language } = usePreferences();
  const projects = useProjectPosts();
  const landingContent = useLandingContent();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const featuredPosts = projects
    .filter((item) => (item.template ?? "None") === "None")
    .slice(0, 3);
  const featuredProjects = projects
    .filter((item) => (item.template ?? "None") !== "None")
    .slice(0, 3);

  const heroEyebrow = fallback(landingContent.heroEyebrow[language], t("landing.hero.fallbackEyebrow", language));
  const heroTitle = fallback(landingContent.heroTitle[language], t("landing.hero.fallbackTitle", language));
  const heroDescription = fallback(landingContent.heroDescription[language], t("landing.hero.fallbackDescription", language));

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

  function renderPlaceholders() {
    return Array.from({ length: 3 }).map((_, index) => (
      <article key={`placeholder-${index}`} className="project-card project-card--placeholder" aria-hidden="true">
        <div className="project-card__placeholder-cover" />
        <div className="project-card__body">
          <h3>{t("landing.placeholder.title", language)}</h3>
          <p>{t("landing.placeholder.description", language)}</p>
        </div>
      </article>
    ));
  }

  return (
    <section className="landing public-surface">
      <SpaceBackground />

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <LiquidGlass as="section" className="hero hero--liquid">
          <div className="hero__content">
            <p className="hero__eyebrow">{heroEyebrow}</p>
            <h1>{heroTitle}</h1>
            <p className="hero__lead">{heroDescription}</p>

            <div className="hero__highlights" aria-label={t("landing.hero.highlights", language)}>
              <span className="hero__highlight-pill">Modular Monolith</span>
              <span className="hero__highlight-pill">Plugin Runtime</span>
              <span className="hero__highlight-pill">Admin Workspace</span>
            </div>

            <div className="hero__actions">
              <button type="button" className="glass-button" onClick={() => navigate("/projects")}>
                {t("landing.hero.openProjects", language)}
              </button>
              <button type="button" className="glass-button glass-button--ghost" onClick={() => navigate("/login")}>
                {t("landing.hero.openAdmin", language)}
              </button>
            </div>
          </div>

          <div className="hero__visual hero__visual--planet">
            <div className="hero__planet-copy">
              <p className="hero__planet-label">{t("landing.hero.orbitLabel", language)}</p>
              <p className="hero__planet-text">{t("landing.hero.orbitText", language)}</p>
            </div>
            <RotatingEarth />
          </div>
        </LiquidGlass>
      </motion.div>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">Curated posts</p>
            <h2 className="portfolio-grid-wrap__title">{t("landing.posts.title", language)}</h2>
          </div>
          <p>{t("landing.posts.description", language)}</p>
        </div>
        <div className="portfolio-grid">{featuredPosts.length > 0 ? renderCards(featuredPosts) : renderPlaceholders()}</div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">Runtime-ready modules</p>
            <h2 className="portfolio-grid-wrap__title">{t("landing.projects.title", language)}</h2>
          </div>
          <p>{t("landing.projects.description", language)}</p>
        </div>
        <div className="portfolio-grid">{featuredProjects.length > 0 ? renderCards(featuredProjects) : renderPlaceholders()}</div>
      </section>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.06 }}>
        <LiquidGlass as="section" className="landing-about landing-about--liquid">
          <div className="landing-about__photo-wrap">
            {landingContent.aboutPhoto ? (
              <img className="landing-about__photo" src={landingContent.aboutPhoto} alt="Profile" />
            ) : (
              <div className="landing-about__photo landing-about__photo--placeholder">
                {t("landing.about.photoPlaceholder", language)}
              </div>
            )}
          </div>

          <div className="landing-about__content">
            <p className="section-heading__eyebrow">{t("landing.about.eyebrow", language)}</p>
            <h2>{fallback(landingContent.aboutTitle[language], t("landing.about.fallbackTitle", language))}</h2>
            <p className="landing-about__intro">
              {fallback(landingContent.aboutText[language], t("landing.about.fallbackText", language))}
            </p>
            <div className="landing-about__divider" aria-hidden="true" />
            <h3>{fallback(landingContent.portfolioTitle[language], t("landing.about.fallbackPortfolioTitle", language))}</h3>
            <ParagraphText
              text={fallback(landingContent.portfolioText[language], t("landing.about.fallbackPortfolioText", language))}
              className="landing-about__paragraph"
            />
          </div>
        </LiquidGlass>
      </motion.div>
    </section>
  );
}
