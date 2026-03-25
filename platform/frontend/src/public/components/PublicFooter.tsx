import { Link } from "react-router-dom";
import { usePreferences } from "../preferences";
import { t } from "../../shared/i18n";

function HomeGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 11.4 12 5l8 6.4V20a1 1 0 0 1-1 1h-4.9v-5.6H9.9V21H5a1 1 0 0 1-1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProjectsGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function GitHubGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.8a8.4 8.4 0 0 0-2.66 16.37c.42.08.58-.18.58-.42v-1.45c-2.34.5-2.83-1-2.83-1-.37-.95-.91-1.2-.91-1.2-.75-.5.06-.49.06-.49.82.06 1.25.84 1.25.84.74 1.26 1.92.9 2.38.69.07-.53.29-.9.53-1.1-1.87-.21-3.84-.93-3.84-4.16 0-.92.33-1.67.86-2.26-.08-.21-.37-1.06.08-2.2 0 0 .71-.23 2.32.86a8 8 0 0 1 4.22 0c1.61-1.09 2.31-.86 2.31-.86.45 1.14.17 1.99.08 2.2.54.59.86 1.34.86 2.26 0 3.24-1.97 3.95-3.85 4.16.31.27.57.79.57 1.6v2.36c0 .24.15.5.58.42A8.4 8.4 0 0 0 12 3.8Z" fill="currentColor" />
    </svg>
  );
}

export function PublicFooter() {
  const { language } = usePreferences();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="public-footer liquid-glass">
      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />
      <div className="liquid-glass__content public-footer__shell">
        <div className="public-footer__copy">
          <span>{t("notFound.footerRights", language, { year: String(currentYear) })}</span>
          <span>{t("notFound.footerOffer", language)}</span>
          <span>{t("notFound.footerPrivacy", language)}</span>
        </div>

        <div className="public-footer__actions">
          <Link to="/" className="public-footer__icon-link" aria-label={t("notFound.footerHomeAria", language)}>
            <HomeGlyph />
          </Link>
          <Link to="/projects" className="public-footer__icon-link" aria-label={t("notFound.footerProjectsAria", language)}>
            <ProjectsGlyph />
          </Link>
          <a
            href="https://github.com/Grumz18/Grummm"
            target="_blank"
            rel="noreferrer"
            className="public-footer__icon-link"
            aria-label={t("notFound.footerGithubAria", language)}
          >
            <GitHubGlyph />
          </a>
        </div>
      </div>
    </footer>
  );
}
