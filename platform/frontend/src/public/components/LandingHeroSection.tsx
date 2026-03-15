import { HeroActions } from "./HeroActions";
import { HeroMorphTitle } from "./HeroMorphTitle";
import type { Language } from "../types";

interface LandingHeroSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  highlightsLabel: string;
  highlights: string[];
  language: Language;
  onOpenProjects: () => void;
  onOpenAdmin: () => void;
  openProjectsLabel: string;
  openAdminLabel: string;
}

export function LandingHeroSection({
  eyebrow,
  title,
  description,
  highlightsLabel: _highlightsLabel,
  highlights: _highlights,
  language,
  onOpenProjects,
  onOpenAdmin,
  openProjectsLabel,
  openAdminLabel
}: LandingHeroSectionProps) {
  return (
    <section className="hero liquid-glass" data-gsap="reveal">
      <div className="hero__backdrop" aria-hidden="true">
        <div className="hero__backdrop-grid" />
        <div className="hero__backdrop-glow hero__backdrop-glow--left" />
        <div className="hero__backdrop-glow hero__backdrop-glow--right" />
      </div>

      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />

      <div className="liquid-glass__content hero__shell">
        <aside className="hero__scene" aria-hidden="true">
          <div className="hero__scene-stage">
            <div className="hero__scene-orb hero__scene-orb--one" />
            <div className="hero__scene-orb hero__scene-orb--two" />
            <div className="hero__scene-line hero__scene-line--one" />
            <div className="hero__scene-line hero__scene-line--two" />
          </div>
        </aside>

        <div className="hero__content">
          <div className="hero__copy">
            <p className="hero__eyebrow">{eyebrow}</p>
            <HeroMorphTitle title={title} language={language} />
          </div>

          <div className="hero__details">
            <p className="hero__lead">{description}</p>
            <HeroActions
              actions={[
                { label: openProjectsLabel, onClick: onOpenProjects },
                { label: openAdminLabel, onClick: onOpenAdmin, variant: "ghost" }
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
