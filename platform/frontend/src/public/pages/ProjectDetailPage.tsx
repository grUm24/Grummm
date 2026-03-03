import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { getProjectById } from "../data/projects";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { usePreferences } from "../preferences";

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { language, theme } = usePreferences();
  const canHover = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? false;

  useSwipeBack(() => navigate(-1), { enabled: !canHover, edgeOnly: true });

  const project = id ? getProjectById(id) : undefined;

  if (!project) {
    return (
      <section className="project-detail">
        <div className="project-detail__title-card">
          <h1>{language === "ru" ? "Проект не найден" : "Project not found"}</h1>
          <button type="button" onClick={() => navigate("/projects")}>
            {language === "ru" ? "К портфолио" : "Back to portfolio"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <motion.article
      className="project-detail"
      initial={{ opacity: 0, scale: 0.985, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.99 }}
      transition={{ duration: 0.28 }}
    >
      <header className="project-detail__title-card">
        <div className="project-detail__title-row">
          <h1>{project.title[language]}</h1>
          <button className="inline-back" type="button" onClick={() => navigate(-1)}>
            {language === "ru" ? "Назад" : "Back"}
          </button>
        </div>
        <p>{project.summary[language]}</p>
      </header>

      <section className="project-detail__video">
        {project.videoUrl ? (
          <video controls preload="none" poster={project.heroImage[theme]}>
            <source src={project.videoUrl} type="video/mp4" />
          </video>
        ) : (
          <img src={project.heroImage[theme]} alt={project.title[language]} loading="lazy" />
        )}
      </section>

      <section className="project-detail__text">
        <p>{project.description[language]}</p>
      </section>

      <section className="project-detail__screens">
        {project.screenshots.map((screen, index) => (
          <img
            key={`${project.id}-screen-${index}`}
            src={screen[theme]}
            alt={`${project.title[language]} ${index + 1}`}
            loading="lazy"
          />
        ))}
      </section>
    </motion.article>
  );
}
