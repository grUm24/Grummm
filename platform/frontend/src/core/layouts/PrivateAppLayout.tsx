import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { usePreferences } from "../../public/preferences";
import { useGsapEnhancements } from "../../shared/ui/useGsapEnhancements";
import { t } from "../../shared/i18n";
import { logoutAdmin } from "../auth/auth-api";
import { useAuthSession } from "../auth/auth-session";

export function PrivateAppLayout() {
  const auth = useAuthSession();
  const location = useLocation();
  const { theme, language, toggleTheme } = usePreferences();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [timeLeftLabel, setTimeLeftLabel] = useState<string>("");
  const [navOpen, setNavOpen] = useState(false);

  useGsapEnhancements(rootRef, [location.pathname]);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

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
    <div ref={rootRef} data-layout="private-app" className="private-layout">
      <div className="private-layout__shell-frame">
        <header className="private-layout__topbar liquid-glass" data-gsap="reveal">
          <div className="liquid-glass__sheen" aria-hidden="true" />
          <div className="liquid-glass__grain" aria-hidden="true" />
          <div className="liquid-glass__content private-layout__topbar-content">
            <div className="private-layout__header-copy">
              <p className="private-layout__eyebrow">{t("private.eyebrow", language)}</p>
              <strong>{t("private.title", language)}</strong>
            </div>

            <div className="private-layout__topbar-meta">
              <span className="private-layout__session-label">{timeLeftLabel}</span>
              <button
                type="button"
                className={`private-layout__menu-toggle ${navOpen ? "is-open" : ""}`}
                aria-expanded={navOpen}
                aria-controls="private-navigation"
                onClick={() => setNavOpen((current) => !current)}
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          </div>
        </header>

        <div className="private-layout__shell">
          <aside className={`private-layout__aside liquid-glass ${navOpen ? "is-open" : ""}`} data-gsap="reveal">
            <div className="liquid-glass__sheen" aria-hidden="true" />
            <div className="liquid-glass__grain" aria-hidden="true" />
            <div className="liquid-glass__content private-layout__aside-content">
              <div className="private-layout__aside-top">
                <h2>{t("private.nav.title", language)}</h2>
                <p>{t("private.nav.description", language)}</p>
              </div>

              <nav id="private-navigation" className="private-layout__nav" data-gsap="stagger">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    data-gsap-button
                    className={({ isActive }) =>
                      isActive ? "private-nav-link private-nav-link--active" : "private-nav-link"
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="private-layout__aside-actions">
                <button
                  type="button"
                  data-gsap-button
                  className="private-layout__theme-button"
                  onClick={toggleTheme}
                  aria-label={t("private.theme.toggleAria", language)}
                >
                  {theme === "dark" ? t("private.theme.light", language) : t("private.theme.dark", language)}
                </button>
                <NavLink className="private-layout__public-link" to="/projects" data-gsap-button>
                  {t("private.link.showcase", language)}
                </NavLink>
                <button
                  type="button"
                  data-gsap-button
                  className="private-layout__logout-button"
                  onClick={() => {
                    void logoutAdmin(auth.accessToken).finally(() => auth.signOut());
                  }}
                >
                  {t("private.logout", language)}
                </button>
              </div>
            </div>
          </aside>

          <main className="private-layout__main">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}