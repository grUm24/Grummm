import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Language } from "../types";

interface HeroMorphTitleProps {
  title: string;
  language: Language;
}

const MORPH_TIME = 1.15;
const COOLDOWN_TIME = 1.6;
const STATIC_BRAND = "Grummm";

function cleanPhrase(value: string): string {
  return value.replace(/[.,!?]+$/u, "").replace(/\s+/gu, " ").trim();
}

function stripBrand(value: string): string {
  return value.replace(/^grummm\s+/iu, "").trim();
}

function getHeroSuffixes(title: string, language: Language): string[] {
  const cleaned = stripBrand(cleanPhrase(title));
  const defaults = language === "ru"
    ? [
        "\u043E\u0436\u0438\u0432\u043B\u044F\u0435\u0442 \u043F\u0440\u043E\u0435\u043A\u0442\u044B",
        "\u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442 \u0434\u0435\u043C\u043E",
        "\u0441\u043E\u0431\u0438\u0440\u0430\u0435\u0442 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B"
      ]
    : [
        "brings projects to life",
        "launches live demos",
        "powers modular platforms"
      ];

  const primary = cleaned.length > 0 && cleaned.length <= 30 ? cleaned : defaults[0];
  return Array.from(new Set([primary, ...defaults]));
}

export function HeroMorphTitle({ title, language }: HeroMorphTitleProps) {
  const filterId = useId().replace(/:/g, "");
  const fromRef = useRef<HTMLSpanElement | null>(null);
  const toRef = useRef<HTMLSpanElement | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const suffixes = useMemo(() => getHeroSuffixes(title, language), [language, title]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileViewport = window.matchMedia("(max-width: 959.98px)");

    const syncAnimationMode = () => {
      setShouldAnimate(!reducedMotion.matches && !mobileViewport.matches && suffixes.length > 1);
    };

    syncAnimationMode();
    reducedMotion.addEventListener("change", syncAnimationMode);
    mobileViewport.addEventListener("change", syncAnimationMode);

    return () => {
      reducedMotion.removeEventListener("change", syncAnimationMode);
      mobileViewport.removeEventListener("change", syncAnimationMode);
    };
  }, [suffixes.length]);

  useEffect(() => {
    const from = fromRef.current;
    const to = toRef.current;
    if (!from || !to || !shouldAnimate || suffixes.length <= 1) {
      return;
    }

    let textIndex = 0;
    let morph = 0;
    let cooldown = COOLDOWN_TIME;
    let lastTime = performance.now();
    let frameId = 0;

    const setTextPair = () => {
      from.textContent = suffixes[textIndex % suffixes.length];
      to.textContent = suffixes[(textIndex + 1) % suffixes.length];
    };

    const doCooldown = () => {
      from.style.filter = "none";
      from.style.opacity = "1";
      to.style.filter = "none";
      to.style.opacity = "0";
    };

    const setMorph = (fraction: number) => {
      const clamped = Math.min(Math.max(fraction, 0.0001), 1);
      const inverse = Math.max(1 - clamped, 0.0001);

      to.style.filter = `blur(${Math.min(8 / clamped - 8, 100)}px)`;
      to.style.opacity = `${Math.pow(clamped, 0.4)}`;
      from.style.filter = `blur(${Math.min(8 / inverse - 8, 100)}px)`;
      from.style.opacity = `${Math.pow(1 - clamped, 0.4)}`;
    };

    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      const wasCoolingDown = cooldown > 0;
      cooldown -= dt;

      if (cooldown <= 0) {
        if (wasCoolingDown) {
          morph = 0;
          setTextPair();
        }

        morph += dt;
        const fraction = morph / MORPH_TIME;

        if (fraction >= 1) {
          textIndex = (textIndex + 1) % suffixes.length;
          setTextPair();
          doCooldown();
          morph = 0;
          cooldown = COOLDOWN_TIME;
        } else {
          setMorph(fraction);
        }
      } else {
        doCooldown();
      }

      frameId = window.requestAnimationFrame(animate);
    };

    setTextPair();
    doCooldown();
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [shouldAnimate, suffixes]);

  const primarySuffix = suffixes[0];
  const longestSuffix = suffixes.reduce(
    (longest, current) => (current.length > longest.length ? current : longest),
    primarySuffix
  );
  const ariaLabel = `${STATIC_BRAND} ${primarySuffix}`;

  if (!shouldAnimate) {
    return (
      <h1 aria-label={ariaLabel}>
        <span className="hero-morph__brand">{STATIC_BRAND}</span>
        <span className="hero-morph__static">{primarySuffix}</span>
      </h1>
    );
  }

  return (
    <h1 aria-label={ariaLabel}>
      <span className="hero-morph__brand">{STATIC_BRAND}</span>
      <span className="hero-morph" aria-hidden="true">
        <svg className="hero-morph__filter" aria-hidden="true" focusable="false">
          <defs>
            <filter id={filterId}>
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 255 -140"
              />
            </filter>
          </defs>
        </svg>

        <span className="hero-morph__measure">{longestSuffix}</span>
        <span className="hero-morph__stack" style={{ filter: `url(#${filterId})` }}>
          <span ref={fromRef} className="hero-morph__text hero-morph__text--from" />
          <span ref={toRef} className="hero-morph__text hero-morph__text--to" />
        </span>
      </span>
    </h1>
  );
}
