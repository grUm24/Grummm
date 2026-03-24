import { Link } from "react-router-dom";
import { t } from "../../shared/i18n";
import { formatPublishedDate } from "../formatPublishedDate";
import { getPortfolioKind } from "../data/project-store";
import type { Language, PortfolioProject, ThemeMode } from "../types";
import { ProgressiveImage } from "./ProgressiveImage";

interface ProjectCardProps {
  project: PortfolioProject;
  theme: ThemeMode;
  language: Language;
  href: string;
}

export function ProjectCard({
  project,
  theme,
  language,
  href
}: ProjectCardProps) {
  const title = project.title[language] || project.title.en;
  const summary = project.summary[language] || project.summary.en;
  const cover = project.heroImage[theme];
  const kind = getPortfolioKind(project);
  const eyebrow = kind === "project"
    ? project.template && project.template !== "None" ? project.template : t("project.card.project", language)
    : t("project.card.showcase", language);
  const publishedAt = formatPublishedDate(project.publishedAt, language);
  const itemType = kind === "post" ? "https://schema.org/BlogPosting" : "https://schema.org/SoftwareApplication";
  const titleProp = kind === "post" ? "headline" : "name";
  const publicUrl = `https://grummm.ru${href}`;

  return (
    <article className="project-card liquid-glass" itemScope itemType={itemType}>
      <meta itemProp="url" content={publicUrl} />
      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />

      <Link to={href} className="project-card__link" aria-label={title} data-gsap-button>
        <div className="liquid-glass__content project-card__shell">
          <div className="project-card__media">
            <ProgressiveImage
              src={cover}
              alt={title}
              loading="lazy"
              itemProp="image"
              wrapperClassName="project-card__media-frame"
            />
          </div>

          <div className="project-card__content">
            <div className="project-card__meta">
              <p className="project-card__eyebrow">{eyebrow}</p>
              {publishedAt ? (
                <time className="project-card__published-at" dateTime={project.publishedAt} itemProp="datePublished">
                  {publishedAt}
                </time>
              ) : null}
            </div>

            <div className="project-card__text">
              <h3 title={title} itemProp={titleProp}>{title}</h3>
              <p className="project-card__summary" title={summary} itemProp="description">{summary}</p>
            </div>

            {project.tags.length > 0 ? (
              <div className="project-card__tags-marquee" aria-label={t("landing.hero.highlights", language)}>
                <div className="project-card__tags-track">
                  {[...project.tags, ...project.tags].map((tag, index) => (
                    <span key={`${project.id}-${tag}-${index}`} className="project-card__tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
