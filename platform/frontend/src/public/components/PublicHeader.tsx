import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { NavLink, useLocation } from "react-router-dom";
import { usePreferences } from "../preferences";
import { t } from "../../shared/i18n";
import { PreferenceSegmentedControl } from "./PreferenceSegmentedControl";

const NAV_ITEMS = [
  { to: "/", key: "public.nav.home", end: true },
  { to: "/projects", key: "public.nav.projects" },
  { to: "/login", key: "public.nav.login" }
] as const;

type PublicControlMode = "theme" | "language";

type NavIndicatorState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function PublicHeader() {
  const { theme, language, setTheme, setLanguage } = usePreferences();
  const location = useLocation();
  const navRef = useRef<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [controlMode, setControlMode] = useState<PublicControlMode>("theme");
  const [navIndicator, setNavIndicator] = useState<NavIndicatorState | null>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useLayoutEffect(() => {
    function syncIndicator() {
      const nav = navRef.current;
      if (!nav) {
        return;
      }

      const activeLink = nav.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
      if (!activeLink) {
        setNavIndicator(null);
        return;
      }

      setNavIndicator({
        x: activeLink.offsetLeft,
        y: activeLink.offsetTop,
        width: activeLink.offsetWidth,
        height: activeLink.offsetHeight
      });
    }

    syncIndicator();
    window.addEventListener("resize", syncIndicator);
    return () => window.removeEventListener("resize", syncIndicator);
  }, [location.pathname, language, menuOpen]);

  return (
    <header className="public-header">
      <div className="public-shell">
        <div className={`public-shell__frame ${menuOpen ? "is-open" : ""}`}>
          <NavLink to="/" className="public-brand">
            <span className="public-brand__mark">G</span>
            <span className="public-brand__copy">
              <strong>Grummm</strong>
              <small>{t("public.brand.subtitle", language)}</small>
            </span>
          </NavLink>

          <button
            type="button"
            className={`public-menu-toggle ${menuOpen ? "is-open" : ""}`}
            aria-expanded={menuOpen}
            aria-controls="public-navigation"
            aria-label={menuOpen ? t("public.menu.close", language) : t("public.menu.open", language)}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav
            ref={navRef}
            id="public-navigation"
            className={`public-nav ${menuOpen ? "is-open" : ""}`}
            aria-label={t("public.nav.primary", language)}
          >
            {navIndicator ? (
              <motion.div
                initial={false}
                className="public-nav__indicator"
                aria-hidden="true"
                animate={navIndicator}
                transition={{ type: "spring", stiffness: 360, damping: 32, mass: 0.82 }}
              />
            ) : null}

            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)}>
                <span className="public-nav__label">{t(item.key, language)}</span>
              </NavLink>
            ))}
          </nav>

          <div className={`public-shell__actions ${menuOpen ? "is-open" : ""}`}>
            {/* Theme and language share one control surface so desktop and mobile keep the same mental model. */}
            <div className="public-control-card public-control-card--preferences">
              <PreferenceSegmentedControl
                label={t("public.nav.primary", language)}
                value={controlMode}
                onChange={setControlMode}
                options={[
                  { value: "theme", label: t("public.appearance.label", language) },
                  { value: "language", label: t("public.language.label", language) }
                ]}
                className="public-control-switch"
                optionClassName="public-control-switch__option"
                indicatorId="public-control-switch"
              />

              <div className="public-control-card__body">
                <span className="public-control-card__label">
                  {controlMode === "theme"
                    ? t("public.appearance.label", language)
                    : t("public.language.label", language)}
                </span>

                {controlMode === "theme" ? (
                  <PreferenceSegmentedControl
                    label={t("public.appearance.label", language)}
                    value={theme}
                    onChange={setTheme}
                    options={[
                      { value: "light", label: t("public.theme.light", language) },
                      { value: "dark", label: t("public.theme.dark", language) }
                    ]}
                    className="public-control-options"
                    optionClassName="public-control-options__option"
                    indicatorId="public-control-theme"
                  />
                ) : (
                  <PreferenceSegmentedControl
                    label={t("public.language.label", language)}
                    value={language}
                    onChange={setLanguage}
                    options={[
                      { value: "ru", label: t("public.language.russian", language) },
                      { value: "en", label: t("public.language.english", language) }
                    ]}
                    className="public-control-options"
                    optionClassName="public-control-options__option"
                    indicatorId="public-control-language"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}