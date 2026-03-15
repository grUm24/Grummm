import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LandingAboutSection } from "../components/LandingAboutSection";
import { LandingHeroSection } from "../components/LandingHeroSection";
import { PortfolioSection } from "../components/PortfolioSection";
import { useLandingContent } from "../data/landing-content-store";
import { useProjectPosts } from "../data/project-store";
import { usePreferences } from "../preferences";
import { t } from "../../shared/i18n";

function fallback(value: string | undefined, next: string): string {
  return value && value.trim().length > 0 ? value : next;
}

const HERO_HIGHLIGHTS = ["Modular Monolith", "Plugin Runtime", "Admin Workspace"];

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
  const aboutTitle = fallback(landingContent.aboutTitle[language], t("landing.about.fallbackTitle", language));
  const aboutText = fallback(landingContent.aboutText[language], t("landing.about.fallbackText", language));
  const portfolioTitle = fallback(landingContent.portfolioTitle[language], t("landing.about.fallbackPortfolioTitle", language));
  const portfolioText = fallback(landingContent.portfolioText[language], t("landing.about.fallbackPortfolioText", language));

  function handleCardCollapse(projectId: string) {
    setExpandedId((current) => (current === projectId ? null : current));
  }

  return (
    <section className="landing-page">
      <LandingHeroSection
        eyebrow={heroEyebrow}
        title={heroTitle}
        description={heroDescription}
        highlightsLabel={t("landing.hero.highlights", language)}
        highlights={HERO_HIGHLIGHTS}
        onOpenProjects={() => navigate("/projects")}
        onOpenAdmin={() => navigate("/login")}
        openProjectsLabel={t("landing.hero.openProjects", language)}
        openAdminLabel={t("landing.hero.openAdmin", language)}
      />

      <PortfolioSection
        eyebrow="Curated posts"
        title={t("landing.posts.title", language)}
        description={t("landing.posts.description", language)}
        items={featuredPosts}
        theme={theme}
        language={language}
        expandedId={expandedId}
        onExpand={setExpandedId}
        onCollapse={handleCardCollapse}
        onNavigate={(projectId) => navigate(`/projects/${projectId}`)}
        placeholderCount={3}
      />

      <PortfolioSection
        eyebrow="Runtime-ready modules"
        title={t("landing.projects.title", language)}
        description={t("landing.projects.description", language)}
        items={featuredProjects}
        theme={theme}
        language={language}
        expandedId={expandedId}
        onExpand={setExpandedId}
        onCollapse={handleCardCollapse}
        onNavigate={(projectId) => navigate(`/projects/${projectId}`)}
        placeholderCount={3}
      />

      <LandingAboutSection
        eyebrow={t("landing.about.eyebrow", language)}
        title={aboutTitle}
        intro={aboutText}
        portfolioTitle={portfolioTitle}
        portfolioText={portfolioText}
        photo={landingContent.aboutPhoto}
        photoPlaceholder={t("landing.about.photoPlaceholder", language)}
      />
    </section>
  );
}