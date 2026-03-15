import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
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

export function PublicHeader() {
  const { theme, language, setTheme, setLanguage } = usePreferences();
  const location = useLocation();
  const navRef = useRef<HTMLElement | null>(null);
  const navIndicatorRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [controlMode, setControlMode] = useState<PublicControlMode>("theme");

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const indicator = navIndicatorRef.current;
    if (!nav || !indicator) {
      return;
    }

    function syncIndicator() {
      const activeLink = nav.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
      if (!activeLink) {
        indicator.style.opacity = "0";
        return;
      }

      indicator.style.opacity = "1";
      gsap.killTweensOf(indicator);
      gsap.to(indicator, {
        x: activeLink.offsetLeft,
        y: activeLink.offsetTop,
        width: activeLink.offsetWidth,
        height: activeLink.offsetHeight,
        duration: 0.46,
        ease: "expo.out",
        overwrite: true,
        force3D: true
      });
    }

    syncIndicator();
    window.addEventListener("resize", syncIndicator);
    return () => window.removeEventListener("resize", syncIndicator);
  }, [location.pathname, language, menuOpen]);

  return (
    <header className="public-header">
      <div className="public-header__shell liquid-glass">
        <div className="liquid-glass__sheen" aria-hidden="true" />
        <div className="liquid-glass__grain" aria-hidden="true" />
        <div className="liquid-glass__content public-header__content">
          <NavLink to="/" className="public-brand">
            <span className="public-brand__mark">G</span>
            <span className="public-brand__copy">
              <strong>Grummm</strong>
              <small>{t("public.brand.subtitle", language)}</small>
            </span>
          </NavLink>

          <button
            type="button"
            data-gsap-button
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

          <div className={`public-header__panel ${menuOpen ? "is-open" : ""}`}>
            <nav
              ref={navRef}
              id="public-navigation"
              className="public-nav liquid-glass"
              aria-label={t("public.nav.primary", language)}
            >
              <div ref={navIndicatorRef} className="public-nav__indicator" aria-hidden="true" />
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)} data-gsap-button>
                  <span className="public-nav__label">{t(item.key, language)}</span>
                </NavLink>
              ))}
            </nav>

            <section className="public-preferences liquid-glass" aria-label={t("public.nav.primary", language)}>
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

              <div className="public-preferences__body">
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
            </section>
          </div>
        </div>
      </div>
    </header>
  );
}