import { useEffect, useMemo, useState, type TouchEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LiquidGlass } from "../components/LiquidGlass";
import { ProjectDetailHeader } from "../components/ProjectDetailHeader";
import { ProjectDetailSummary } from "../components/ProjectDetailSummary";
import { ProjectLightbox } from "../components/ProjectLightbox";
import { ProjectNotFoundCard } from "../components/ProjectNotFoundCard";
import { ProjectScreensGallery } from "../components/ProjectScreensGallery";
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
      <section className="project-detail-page" data-gsap="reveal">
        <ProjectNotFoundCard
          title={t("detail.notFound", language)}
          actionLabel={t("detail.backToProjects", language)}
          onAction={() => navigate("/projects")}
        />
      </section>
    );
  }

  return (
    <article className="project-detail-page">
      <ProjectDetailHeader
        eyebrow={t("detail.eyebrow", language)}
        title={project.title[language]}
        description={project.summary[language]}
        tags={previewTags}
        backLabel={t("detail.back", language)}
        onBack={() => navigate(-1)}
      />

      {project.videoUrl ? (
        <LiquidGlass as="section" className="project-detail__video project-detail__media-panel" data-gsap="reveal">
          <video controls preload="none" poster={project.heroImage[theme]}>
            <source src={project.videoUrl} type="video/mp4" />
          </video>
        </LiquidGlass>
      ) : null}

      <ProjectDetailSummary
        imageSrc={project.heroImage[theme]}
        imageAlt={project.title[language]}
        eyebrow={t("detail.description", language)}
        description={project.description[language]}
      />

      <ProjectScreensGallery
        projectId={project.id}
        title={project.title[language]}
        theme={theme}
        screenshots={project.screenshots}
        onOpen={openLightbox}
      />

      {lightboxIndex !== null ? (
        <ProjectLightbox
          imageSrc={project.screenshots[lightboxIndex][theme]}
          imageAlt={`${project.title[language]} ${lightboxIndex + 1}`}
          zoom={lightboxZoom}
          onClose={closeLightbox}
          onPrev={prevSlide}
          onNext={nextSlide}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onZoomOut={() => setLightboxZoom((value) => Math.max(1, value - 0.2))}
          onResetZoom={() => setLightboxZoom(1)}
          onZoomIn={() => setLightboxZoom((value) => Math.min(3, value + 0.2))}
        />
      ) : null}
    </article>
  );
}