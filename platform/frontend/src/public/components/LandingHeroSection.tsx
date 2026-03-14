import { HeroActions } from "./HeroActions";
import { HeroHighlights } from "./HeroHighlights";
import { RotatingEarth } from "./RotatingEarth";

interface LandingHeroSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  orbitLabel: string;
  orbitText: string;
  highlightsLabel: string;
  highlights: string[];
  onOpenProjects: () => void;
  onOpenAdmin: () => void;
  openProjectsLabel: string;
  openAdminLabel: string;
}

export function LandingHeroSection({
  eyebrow,
  title,
  description,
  orbitLabel,
  orbitText,
  highlightsLabel,
  highlights,
  onOpenProjects,
  onOpenAdmin,
  openProjectsLabel,
  openAdminLabel
}: LandingHeroSectionProps) {
  return (
    <section className="hero liquid-glass" data-gsap="reveal">
      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />
      <div className="liquid-glass__content hero__shell">
        <div className="hero__content">
          <div className="hero__copy">
            <p className="hero__eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="hero__lead">{description}</p>
          </div>

          <div className="hero__supporting">
            <HeroHighlights items={highlights} ariaLabel={highlightsLabel} />
            <HeroActions
              actions={[
                { label: openProjectsLabel, onClick: onOpenProjects },
                { label: openAdminLabel, onClick: onOpenAdmin, variant: "ghost" }
              ]}
            />
          </div>
        </div>

        <aside className="hero__visual">
          <div className="hero__visual-card" role="img" aria-label={`${orbitLabel}. ${orbitText}`}>
            <div className="hero__visual-copy">
              <p className="hero__planet-label">{orbitLabel}</p>
              <p className="hero__planet-text">{orbitText}</p>
            </div>
            <RotatingEarth />
          </div>
        </aside>
      </div>
    </section>
  );
}