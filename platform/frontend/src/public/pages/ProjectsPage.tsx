import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ProjectCardGrid } from "../components/ProjectCardGrid";
import { ProjectsCatalogHeader } from "../components/ProjectsCatalogHeader";
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

  function handleCardCollapse(projectId: string) {
    setExpandedId((current) => (current === projectId ? null : current));
  }

  return (
    <motion.section
      className="projects-page public-surface"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ProjectsCatalogHeader
        eyebrow={t("projects.eyebrow", language)}
        title={t("projects.title", language)}
        description={t("projects.description", language)}
        count={projects.length}
        backLabel={t("projects.back", language)}
        onBack={() => navigate("/")}
      />

      <ProjectCardGrid
        items={projects}
        theme={theme}
        language={language}
        expandedId={expandedId}
        onExpand={setExpandedId}
        onCollapse={handleCardCollapse}
        onNavigate={(projectId) => navigate(`/projects/${projectId}`)}
        className="portfolio-grid--catalog"
      />
    </motion.section>
  );
}
