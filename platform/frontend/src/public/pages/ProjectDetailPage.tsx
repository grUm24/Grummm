import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LiquidGlass } from "../components/LiquidGlass";
import { MediaLoadingIndicator } from "../components/MediaLoadingIndicator";
import { PostActions } from "../components/PostActions";
import { PostContentRenderer } from "../components/PostContentRenderer";
import { ProjectDetailHeader } from "../components/ProjectDetailHeader";
import { ProjectDetailSummary } from "../components/ProjectDetailSummary";
import { ProjectLightbox } from "../components/ProjectLightbox";
import { ProjectNotFoundCard } from "../components/ProjectNotFoundCard";
import { ProjectScreensGallery } from "../components/ProjectScreensGallery";
import { RelatedEntriesSection } from "../components/RelatedEntriesSection";
import { formatPublishedMeta } from "../formatPublishedDate";
import { useDeferredMedia } from "../hooks/useDeferredMedia";
import {
  fetchRelatedEntries,
  getPortfolioKind,
  isPortfolioPost,
  isPortfolioProject,
  isPortfolioPublicDemoEnabled,
  isPortfolioPubliclyVisible,
  useProjectPost,
  useProjectPosts
} from "../data/project-store";
import type { RelatedEntry } from "../types";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { usePreferences } from "../preferences";
import { t } from "../../shared/i18n";
import { useDocumentMetadata } from "../../shared/seo/useDocumentMetadata";

interface ProjectDetailPageProps {
  mode?: "project" | "post";
}

function resolvePublicDemoOrigin(): string {
  const configuredOrigin = typeof import.meta.env.VITE_PUBLIC_DEMO_ORIGIN === "string"
    ? import.meta.env.VITE_PUBLIC_DEMO_ORIGIN.trim()
    : "";
  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return window.location.origin;
    }
  }

  return "https://demo.grummm.ru";
}

function buildPublicDemoUrl(projectId?: string): string | undefined {
  if (!projectId) {
    return undefined;
  }

  try {
    return new URL(`/${projectId}/viewer/`, resolvePublicDemoOrigin()).toString();
  } catch {
    return undefined;
  }
}

export function ProjectDetailPage({ mode = "project" }: ProjectDetailPageProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { language, theme } = usePreferences();
  const canHover = (typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) ?? false;

  useSwipeBack(() => navigate(-1), { enabled: !canHover, edgeOnly: true });

  const project = useProjectPost(id);
  const allEntries = useProjectPosts();
  const [serverRelated, setServerRelated] = useState<RelatedEntry[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [projectVideoReady, setProjectVideoReady] = useState(false);
  const projectVideoFrameRef = useRef<HTMLDivElement | null>(null);
  const shouldLoadProjectVideo = useDeferredMedia(projectVideoFrameRef, { rootMargin: "360px 0px" });

  const resolvedKind = useMemo(() => (project ? getPortfolioKind(project) : null), [project]);

  // Fetch server-computed related entries (based on explicit relations + shared topics)
  useEffect(() => {
    setServerRelated([]);
    if (id) {
      void fetchRelatedEntries(id).then(setServerRelated);
    }
  }, [id]);

  // Convert server RelatedEntry[] to PortfolioProject-shaped objects for RelatedEntriesSection
  const relatedPosts = useMemo(() => {
    const fromServer = serverRelated
      .filter((r) => r.kind === "post")
      .map((r) => ({ id: r.id, kind: r.kind, title: r.title, summary: r.summary, heroImage: r.heroImage, tags: [], screenshots: [] }) as unknown as import("../types").PortfolioProject);
    if (fromServer.length > 0) return fromServer.slice(0, 3);
    // Fallback to naive filtering if server returned nothing
    return allEntries.filter((entry) => entry.id !== id && isPortfolioPost(entry) && isPortfolioPubliclyVisible(entry)).slice(0, 3);
  }, [serverRelated, allEntries, id]);

  const relatedProjects = useMemo(() => {
    const fromServer = serverRelated
      .filter((r) => r.kind === "project")
      .map((r) => ({ id: r.id, kind: r.kind, title: r.title, summary: r.summary, heroImage: r.heroImage, tags: [], screenshots: [] }) as unknown as import("../types").PortfolioProject);
    if (fromServer.length > 0) return fromServer.slice(0, 3);
    return allEntries.filter((entry) => entry.id !== id && isPortfolioProject(entry) && isPortfolioPubliclyVisible(entry)).slice(0, 3);
  }, [serverRelated, allEntries, id]);
  const publishedMeta = project ? formatPublishedMeta(project.publishedAt, language) ?? undefined : undefined;
  const demoActionLabel = language === "ru" ? "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C demo \u043F\u0440\u043E\u0435\u043A\u0442\u0430" : "Show project demo";
  const publicDemoUrl = project ? buildPublicDemoUrl(project.id) : undefined;
  const canShowPublicDemo = Boolean(
    project
    && mode === "project"
    && isPortfolioPublicDemoEnabled(project)
  );
  const detailTitle = project
    ? `${project.title[language] || project.title.en || project.id} | Grummm`
    : `${mode === "post" ? t("posts.title", language) : t("projects.title", language)} | Grummm`;
  const detailDescription = project
    ? (project.summary[language] || project.summary.en || project.description[language] || project.description.en || "Grummm public entry details.")
    : (mode === "post" ? t("posts.description", language) : t("projects.description", language));
  const detailPath = mode === "post" ? `/posts/${id ?? ""}` : `/projects/${id ?? ""}`;
  const detailCanonicalUrl = `https://grummm.ru${detailPath}`;
  const detailKeywords = project
    ? Array.from(new Set([
        "grummm",
        mode === "post" ? "post" : "project",
        project.title.en,
        project.title[language],
        ...project.tags
      ].filter((value): value is string => typeof value === "string" && value.trim().length > 0))).join(", ")
    : undefined;
  const heroImageUrl = project ? project.heroImage[theme] || project.heroImage.light || project.heroImage.dark : undefined;
  const articleStructuredData = useMemo(() => {
    if (!project || mode !== "post") {
      return null;
    }

    const headline = project.title[language] || project.title.en || project.id;
    const description = project.summary[language] || project.summary.en || project.description[language] || project.description.en || headline;

    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BlogPosting",
          headline,
          description,
          url: detailCanonicalUrl,
          mainEntityOfPage: detailCanonicalUrl,
          inLanguage: language === "ru" ? "ru-RU" : "en-US",
          datePublished: project.publishedAt,
          dateModified: project.publishedAt,
          image: heroImageUrl ? [new URL(heroImageUrl, "https://grummm.ru").toString()] : undefined,
          keywords: project.tags.length > 0 ? project.tags.join(", ") : undefined,
          author: {
            "@type": "Organization",
            name: "Grummm"
          },
          publisher: {
            "@type": "Organization",
            name: "Grummm"
          }
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Grummm",
              item: "https://grummm.ru/"
            },
            {
              "@type": "ListItem",
              position: 2,
              name: language === "ru" ? "Посты" : "Posts",
              item: "https://grummm.ru/posts"
            },
            {
              "@type": "ListItem",
              position: 3,
              name: headline,
              item: detailCanonicalUrl
            }
          ]
        }
      ]
    };
  }, [detailCanonicalUrl, heroImageUrl, language, mode, project]);

  useDocumentMetadata({
    title: detailTitle,
    description: detailDescription,
    path: detailPath,
    language,
    keywords: detailKeywords,
    ogType: mode === "post" ? "article" : "website",
    image: heroImageUrl,
    publishedTime: mode === "post" ? project?.publishedAt : undefined,
    structuredData: articleStructuredData
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousRootBehavior = root.style.scrollBehavior;
    const previousBodyBehavior = body.style.scrollBehavior;

    root.style.scrollBehavior = "auto";
    body.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);

    return () => {
      root.style.scrollBehavior = previousRootBehavior;
      body.style.scrollBehavior = previousBodyBehavior;
    };
  }, [mode, id]);

  useEffect(() => {
    setProjectVideoReady(false);
  }, [project?.videoUrl]);

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

  if (!project || resolvedKind !== mode || !isPortfolioPubliclyVisible(project)) {
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
      {mode === "post" ? (
        <nav className="post-breadcrumbs" aria-label={language === "ru" ? "Хлебные крошки" : "Breadcrumb"}>
          <ol className="post-breadcrumbs__list">
            <li className="post-breadcrumbs__item">
              <Link to="/">Grummm</Link>
            </li>
            <li className="post-breadcrumbs__item">
              <Link to="/posts">{language === "ru" ? "Посты" : "Posts"}</Link>
            </li>
            <li className="post-breadcrumbs__item" aria-current="page">
              <span>{project.title[language] || project.title.en || project.id}</span>
            </li>
          </ol>
        </nav>
      ) : null}

      <ProjectDetailHeader
        eyebrow={mode === "post" ? t("detail.postEyebrow", language) : t("detail.projectEyebrow", language)}
        title={project.title[language]}
        description={project.summary[language]}
        meta={publishedMeta}
        metaDateTime={mode === "post" ? project.publishedAt : undefined}
        tags={[]}
        backLabel={t("detail.back", language)}
        onBack={() => navigate(-1)}
        actionLabel={canShowPublicDemo && publicDemoUrl ? demoActionLabel : undefined}
        actionHref={canShowPublicDemo && publicDemoUrl ? publicDemoUrl : undefined}
        extraActions={mode === "post" ? (
          <PostActions
            postId={project.id}
            postTitle={project.title[language] || project.title.en || project.id}
            postUrl={detailCanonicalUrl}
            language={language}
          />
        ) : undefined}
      />

      {project.videoUrl ? (
        <LiquidGlass as="section" className="project-detail__video project-detail__media-panel" data-gsap="reveal">
          <div
            ref={(node) => {
              projectVideoFrameRef.current = node;
            }}
            className={`project-detail__video-frame media-frame media-frame--video ${projectVideoReady ? "is-loaded" : ""}`}
            aria-busy={!projectVideoReady}
          >
            {!projectVideoReady ? <MediaLoadingIndicator compact /> : null}
            <video
              className="media-frame__asset"
              controls
              preload={shouldLoadProjectVideo ? "metadata" : "none"}
              poster={project.heroImage[theme]}
              onLoadedData={() => setProjectVideoReady(true)}
              onCanPlay={() => setProjectVideoReady(true)}
              onError={() => setProjectVideoReady(true)}
            >
              {shouldLoadProjectVideo ? <source src={project.videoUrl} type="video/mp4" /> : null}
            </video>
          </div>
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

          <RelatedEntriesSection language={language} posts={relatedPosts} projects={relatedProjects} />

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
