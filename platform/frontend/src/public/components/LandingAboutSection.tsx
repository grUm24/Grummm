import { LiquidGlass } from "./LiquidGlass";
import { ParagraphText } from "./ParagraphText";

interface LandingAboutSectionProps {
  eyebrow: string;
  title: string;
  intro: string;
  portfolioTitle: string;
  portfolioText: string;
  photo?: string;
  photoAlt?: string;
  photoPlaceholder: string;
}

export function LandingAboutSection({
  eyebrow,
  title,
  intro,
  portfolioTitle,
  portfolioText,
  photo,
  photoAlt = "Profile",
  photoPlaceholder
}: LandingAboutSectionProps) {
  return (
    <LiquidGlass as="section" className="landing-about landing-about--liquid">
      <div className="landing-about__content landing-about__body">
        <div className="landing-about__photo-wrap">
          {photo ? (
            <img className="landing-about__photo" src={photo} alt={photoAlt} />
          ) : (
            <div className="landing-about__photo landing-about__photo--placeholder">{photoPlaceholder}</div>
          )}
        </div>

        <p className="sr-only">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="landing-about__intro">{intro}</p>
        <div className="landing-about__divider" aria-hidden="true" />
        <h3>{portfolioTitle}</h3>
        <ParagraphText text={portfolioText} className="landing-about__paragraph" />
      </div>
    </LiquidGlass>
  );
}