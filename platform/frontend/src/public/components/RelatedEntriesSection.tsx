import { Link } from "react-router-dom";
import { t } from "../../shared/i18n";
import { getPublicEntryPath } from "../data/project-store";
import type { Language, PortfolioProject } from "../types";

interface RelatedEntriesSectionProps {
  language: Language;
  posts: PortfolioProject[];
  projects: PortfolioProject[];
}

export function RelatedEntriesSection({ language, posts, projects }: RelatedEntriesSectionProps) {
  const hasPosts = posts.length > 0;
  const hasProjects = projects.length > 0;
  const headingId = `related-entries-title-${language}`;

  if (!hasPosts && !hasProjects) {
    return null;
  }

  return (
    <aside className="related-entries liquid-glass" data-gsap="reveal" aria-labelledby={headingId}>
      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />
      <div className="liquid-glass__content related-entries__shell">
        <header className="related-entries__header">
          <h2 id={headingId}>{t("related.title", language)}</h2>
          <p>{t("related.description", language)}</p>
        </header>

        <div className="related-entries__groups">
          {hasPosts ? (
            <section className="related-entries__group">
              <h3>{t("related.posts", language)}</h3>
              <div className="related-entries__list">
                {posts.map((entry) => (
                  <Link key={entry.id} to={getPublicEntryPath(entry)} className="related-entries__item">
                    <strong>{entry.title[language] || entry.title.en}</strong>
                    <span>{entry.summary[language] || entry.summary.en}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {hasProjects ? (
            <section className="related-entries__group">
              <h3>{t("related.projects", language)}</h3>
              <div className="related-entries__list">
                {projects.map((entry) => (
                  <Link key={entry.id} to={getPublicEntryPath(entry)} className="related-entries__item">
                    <strong>{entry.title[language] || entry.title.en}</strong>
                    <span>{entry.summary[language] || entry.summary.en}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
