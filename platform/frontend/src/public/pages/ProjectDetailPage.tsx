import { motion } from "framer-motion";
import { useEffect, useMemo, useState, type TouchEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LiquidGlass } from "../components/LiquidGlass";
import { ParagraphText } from "../components/ParagraphText";
import { SpaceBackground } from "../components/SpaceBackground";
import { useProjectPost } from "../data/project-store";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { usePreferences } from "../preferences";
import { t } from "../../shared/i18n";

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { language, theme } = usePreferences();
  const canHover = (typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) ?? false;

  useSwipeBack(() => navigate(-1), { enabled: !canHover, edgeOnly: true });

  const project = useProjectPost(id);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const previewTags = useMemo(() => project?.tags ?? [], [project?.tags]);

  function openLightbox(index: number) {
    setLightboxIndex(index);
    setLightboxZoom(1);
  }

  function closeLightbox() {
    setLightboxIndex(null);
    setLightboxZoom(1);
  }

  function nextSlide() {
    if (!project || lightboxIndex === null) {
      return;
    }

    setLightboxIndex((lightboxIndex + 1) % project.screenshots.length);
    setLightboxZoom(1);
  }

  function prevSlide() {
    if (!project || lightboxIndex === null) {
      return;
    }

    setLightboxIndex((lightboxIndex - 1 + project.screenshots.length) % project.screenshots.length);
    setLightboxZoom(1);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    setTouchStartX(event.changedTouches[0]?.clientX ?? null);
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const delta = endX - touchStartX;
    if (Math.abs(delta) > 44) {
      if (delta < 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    setTouchStartX(null);
  }

  useEffect(() => {
    if (lightboxIndex === null) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeLightbox();
      }
      if (event.key === "ArrowRight") {
        nextSlide();
      }
      if (event.key === "ArrowLeft") {
        prevSlide();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex]);

  if (!project) {
    return (
      <section className="project-detail public-surface">
        <SpaceBackground />
        <LiquidGlass as="div" className="project-detail__title-card">
          <h1>{t("detail.notFound", language)}</h1>
          <button type="button" className="glass-button" onClick={() => navigate("/projects")}>
            {t("detail.backToProjects", language)}
          </button>
        </LiquidGlass>
      </section>
    );
  }

  return (
    <motion.article
      className="project-detail public-surface"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <SpaceBackground />

      <LiquidGlass as="header" className="project-detail__title-card">
        <div className="project-detail__title-row">
          <div>
            <p className="section-heading__eyebrow">{t("detail.eyebrow", language)}</p>
            <h1>{project.title[language]}</h1>
            <p>{project.summary[language]}</p>
          </div>
          <button className="inline-back" type="button" onClick={() => navigate(-1)}>
            {t("detail.back", language)}
          </button>
        </div>
        {previewTags.length > 0 ? (
          <div className="project-detail__tag-row">
            {previewTags.map((tag) => (
              <span key={tag} className="project-card__tag-pill">{tag}</span>
            ))}
          </div>
        ) : null}
      </LiquidGlass>

      {project.videoUrl ? (
        <LiquidGlass as="section" className="project-detail__video project-detail__media-panel">
          <video controls preload="none" poster={project.heroImage[theme]}>
            <source src={project.videoUrl} type="video/mp4" />
          </video>
        </LiquidGlass>
      ) : null}

      <LiquidGlass as="section" className="project-detail__summary">
        <img src={project.heroImage[theme]} alt={project.title[language]} loading="lazy" />
        <div className="project-detail__text">
          <p className="section-heading__eyebrow">{t("detail.description", language)}</p>
          <ParagraphText text={project.description[language]} className="project-detail__paragraph" />
        </div>
      </LiquidGlass>

      <section className="project-detail__screens">
        {project.screenshots.map((screen, index) => {
          const src = screen[theme];
          return (
            <LiquidGlass
              key={`${project.id}-screen-${index}`}
              as="button"
              type="button"
              className="project-detail__screen-button"
              onClick={() => openLightbox(index)}
            >
              <img src={src} alt={`${project.title[language]} ${index + 1}`} loading="lazy" />
            </LiquidGlass>
          );
        })}
      </section>

      {lightboxIndex !== null ? (
        <div className="project-lightbox" role="dialog" aria-modal="true" onClick={closeLightbox}>
          <div
            className="project-lightbox__content"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <button type="button" className="project-lightbox__close" onClick={closeLightbox}>
              ×
            </button>
            <button type="button" className="project-lightbox__nav project-lightbox__nav--prev" onClick={prevSlide}>
              {"<"}
            </button>
            <img
              src={project.screenshots[lightboxIndex][theme]}
              alt={`${project.title[language]} ${lightboxIndex + 1}`}
              style={{ transform: `scale(${lightboxZoom})` }}
            />
            <button type="button" className="project-lightbox__nav project-lightbox__nav--next" onClick={nextSlide}>
              {">"}
            </button>
            <div className="project-lightbox__toolbar">
              <button type="button" onClick={() => setLightboxZoom((value) => Math.max(1, value - 0.2))}>−</button>
              <button type="button" onClick={() => setLightboxZoom(1)}>100%</button>
              <button type="button" onClick={() => setLightboxZoom((value) => Math.min(3, value + 0.2))}>+</button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.article>
  );
}
