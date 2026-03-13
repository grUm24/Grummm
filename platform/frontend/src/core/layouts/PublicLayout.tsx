import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { usePreferences } from "../../public/preferences";
import { t } from "../../shared/i18n";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { theme, language, toggleTheme, setLanguage } = usePreferences();

  return (
    <div data-layout="public" className="public-layout">
      <header className="public-shell">
        <NavLink to="/" className="public-brand">
          <span className="public-brand__mark">G</span>
          <span>
            <strong>Grummm</strong>
            <small>{t("public.brand.subtitle", language)}</small>
          </span>
        </NavLink>

        <nav className="public-nav" aria-label={t("public.nav.primary", language)}>
          <NavLink to="/" end>
            {t("public.nav.home", language)}
          </NavLink>
          <NavLink to="/projects">
            {t("public.nav.projects", language)}
          </NavLink>
          <NavLink to="/login">
            {t("public.nav.login", language)}
          </NavLink>
        </nav>

        <div className="public-shell__actions">
          <button type="button" className="glass-button glass-button--ghost" onClick={toggleTheme}>
            {theme === "dark" ? t("public.theme.light", language) : t("public.theme.dark", language)}
          </button>
          <button
            type="button"
            className="glass-button glass-button--ghost"
            onClick={() => setLanguage(language === "ru" ? "en" : "ru")}
          >
            {language === "ru" ? t("public.language.english", language) : t("public.language.russian", language)}
          </button>
        </div>
      </header>

      <main className="public-layout__content">{children}</main>
    </div>
  );
}
