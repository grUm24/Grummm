import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { usePreferences } from "../../public/preferences";
import { t } from "../../shared/i18n";
import { logoutAdmin } from "../auth/auth-api";
import { useAuthSession } from "../auth/auth-session";

interface PrivateAppLayoutProps {
  children: ReactNode;
}

export function PrivateAppLayout({ children }: PrivateAppLayoutProps) {
  const auth = useAuthSession();
  const { theme, language, toggleTheme } = usePreferences();
  const [timeLeftLabel, setTimeLeftLabel] = useState<string>("");

  useEffect(() => {
    function updateLabel() {
      if (!auth.accessTokenExpiresAtUtc) {
        setTimeLeftLabel(t("private.session.unknown", language));
        return;
      }

      const expiresAt = Date.parse(auth.accessTokenExpiresAtUtc);
      if (!Number.isFinite(expiresAt)) {
        setTimeLeftLabel(t("private.session.unknown", language));
        return;
      }

      const diffMs = Math.max(0, expiresAt - Date.now());
      const totalMinutes = Math.floor(diffMs / 60_000);
      const seconds = Math.floor((diffMs % 60_000) / 1000);
      const remaining = `${totalMinutes}:${String(seconds).padStart(2, "0")}`;
      setTimeLeftLabel(t("private.session.label", language, { time: remaining }));
    }

    updateLabel();
    const timer = window.setInterval(updateLabel, 1000);
    return () => window.clearInterval(timer);
  }, [auth.accessTokenExpiresAtUtc, language]);

  const navItems = [
    { to: "/app", label: t("private.nav.overview", language), end: true },
    { to: "/app/projects", label: t("private.nav.projects", language) },
    { to: "/app/posts", label: t("private.nav.posts", language) },
    { to: "/app/content", label: t("private.nav.content", language) },
    { to: "/app/security", label: t("private.nav.security", language) },
    { to: "/app/tasks", label: "TaskTracker" }
  ];

  return (
    <div data-layout="private-app" className="private-layout">
      <header className="private-layout__header">
        <div>
          <p className="private-layout__eyebrow">{t("private.eyebrow", language)}</p>
          <strong>{t("private.title", language)}</strong>
        </div>

        <div className="private-layout__header-actions">
          <span className="private-layout__session-label">{timeLeftLabel}</span>
          <button
            type="button"
            className="private-layout__theme-button"
            onClick={toggleTheme}
            aria-label={t("private.theme.toggleAria", language)}
          >
            {theme === "dark" ? t("private.theme.light", language) : t("private.theme.dark", language)}
          </button>
          <NavLink className="private-layout__public-link" to="/projects">
            {t("private.link.showcase", language)}
          </NavLink>
          <button
            type="button"
            className="private-layout__logout-button"
            onClick={() => {
              void logoutAdmin(auth.accessToken).finally(() => auth.signOut());
            }}
          >
            {t("private.logout", language)}
          </button>
        </div>
      </header>

      <div className="private-layout__shell">
        <aside className="private-layout__aside">
          <div className="private-layout__aside-top">
            <h2>{t("private.nav.title", language)}</h2>
            <p>{t("private.nav.description", language)}</p>
          </div>
          <nav className="private-layout__nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? "private-nav-link private-nav-link--active" : "private-nav-link"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="private-layout__main">{children}</main>
      </div>
    </div>
  );
}
