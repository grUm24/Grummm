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
    <section className="hero hero--liquid">
      <div className="hero__shell">
        <div className="hero__content">
          <p className="hero__eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="hero__lead">{description}</p>

          <HeroHighlights items={highlights} ariaLabel={highlightsLabel} />

          <HeroActions
            actions={[
              { label: openProjectsLabel, onClick: onOpenProjects },
              { label: openAdminLabel, onClick: onOpenAdmin, variant: "ghost" }
            ]}
          />
        </div>

        <div className="hero__visual hero__visual--planet" role="img" aria-label={`${orbitLabel}. ${orbitText}`}>
          <div className="hero__planet-copy sr-only">
            <p className="hero__planet-label">{orbitLabel}</p>
            <p className="hero__planet-text">{orbitText}</p>
          </div>
          <RotatingEarth />
        </div>
      </div>
    </section>
  );
}