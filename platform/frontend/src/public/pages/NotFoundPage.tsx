import { Link } from "react-router-dom";
import { ProgressiveImage } from "../components/ProgressiveImage";
import { usePreferences } from "../preferences";
import { t } from "../../shared/i18n";
import { useDocumentMetadata } from "../../shared/seo/useDocumentMetadata";
import notFoundCat from "../../images/404.png";

export function NotFoundPage() {
  const { language } = usePreferences();

  useDocumentMetadata({
    title: "404 | Grummm",
    description: t("notFound.description", language),
    path: "/404",
    language,
    keywords: language === "ru" ? "grummm, 404, СЃС‚СЂР°РЅРёС†Р° РЅРµ РЅР°Р№РґРµРЅР°" : "grummm, 404, page not found",
    robots: "noindex,nofollow,noarchive"
  });

  return (
    <section className="not-found-page" data-gsap="reveal">
      <div className="not-found-page__hero liquid-glass">
        <div className="liquid-glass__sheen" aria-hidden="true" />
        <div className="liquid-glass__grain" aria-hidden="true" />
        <div className="liquid-glass__content not-found-page__hero-shell">
          <div className="not-found-page__copy">
            <p className="not-found-page__badge">{t("notFound.eyebrow", language)}</p>
            <h1 className="not-found-page__title">{t("notFound.title", language)}</h1>
            <p className="not-found-page__description">{t("notFound.description", language)}</p>
            <div className="not-found-page__actions">
              <Link to="/" className="glass-button">
                {t("notFound.backHome", language)}
              </Link>
              <Link to="/projects" className="glass-button glass-button--ghost">
                {t("notFound.openProjects", language)}
              </Link>
            </div>
          </div>

          <div className="not-found-page__art">
            <div className="not-found-page__art-panel">
              <ProgressiveImage
                src={notFoundCat}
                alt={t("notFound.title", language)}
                loading="eager"
                fetchPriority="high"
                wrapperClassName="not-found-page__art-frame"
                className="not-found-page__art-image"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
