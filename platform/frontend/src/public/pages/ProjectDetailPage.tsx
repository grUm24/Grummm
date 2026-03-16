import { useEffect, useMemo, useState, type TouchEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LiquidGlass } from "../components/LiquidGlass";
import { PostContentRenderer } from "../components/PostContentRenderer";
import { ProjectDetailHeader } from "../components/ProjectDetailHeader";
import { ProjectDetailSummary } from "../components/ProjectDetailSummary";
import { ProjectLightbox } from "../components/ProjectLightbox";
import { ProjectNotFoundCard } from "../components/ProjectNotFoundCard";
import { ProjectScreensGallery } from "../components/ProjectScreensGallery";
import { RelatedEntriesSection } from "../components/RelatedEntriesSection";
import { getPortfolioKind, isPortfolioPost, isPortfolioProject, useProjectPost, useProjectPosts } from "../data/project-store";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { usePreferences } from "../preferences";
import { t } from "../../shared/i18n";

interface ProjectDetailPageProps {
  mode?: "project" | "post";
}

export function ProjectDetailPage({ mode = "project" }: ProjectDetailPageProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { language, theme } = usePreferences();
  const canHover = (typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) ?? false;

  useSwipeBack(() => navigate(-1), { enabled: !canHover, edgeOnly: true });

  const project = useProjectPost(id);
  const allEntries = useProjectPosts();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const resolvedKind = useMemo(() => (project ? getPortfolioKind(project) : null), [project]);
  const relatedPosts = useMemo(
    () => allEntries.filter((entry) => entry.id !== id && isPortfolioPost(entry)).slice(0, 3),
    [allEntries, id]
  );
  const relatedProjects = useMemo(
    () => allEntries.filter((entry) => entry.id !== id && isPortfolioProject(entry)).slice(0, 3),
    [allEntries, id]
  );

  function openLightbox(index: number) {
    setLightboxIndex(index);
    setLightboxZoom(1);
  }

  function closeLightbox() {
    setLightboxIndex(null);
    setLightboxZoom(1);
  }

  function nextSlide() {
    if (!project || lightboxIndex === null || project.screenshots.length === 0) {
      return;
    }

    setLightboxIndex((lightboxIndex + 1) % project.screenshots.length);
    setLightboxZoom(1);
  }

  function prevSlide() {
    if (!project || lightboxIndex === null || project.screenshots.length === 0) {
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
  }, [lightboxIndex, project]);

  if (!project || resolvedKind !== mode) {
    return (
      <section className="project-detail-page" data-gsap="reveal">
        <ProjectNotFoundCard
          title={t("detail.notFound", language)}
          actionLabel={mode === "post" ? t("detail.backToPosts", language) : t("detail.backToProjects", language)}
          onAction={() => navigate(mode === "post" ? "/posts" : "/projects")}
        />
      </section>
    );
  }

  return (
    <article className="project-detail-page">
      <ProjectDetailHeader
        eyebrow={mode === "post" ? t("detail.postEyebrow", language) : t("detail.projectEyebrow", language)}
        title={project.title[language]}
        description={project.summary[language]}
        tags={[]}
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

      {mode === "post" ? (
        <>
          <PostContentRenderer project={project} language={language} theme={theme} />
          <RelatedEntriesSection language={language} posts={relatedPosts} projects={relatedProjects} />
        </>
      ) : (
        <>
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
        </>
      )}
    </article>
  );
}