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
    <section className="about-section liquid-glass" data-gsap="reveal">
      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />
      <div className="liquid-glass__content about-section__shell">
        <div className="about-section__media">
          {photo ? (
            <img className="about-section__photo" src={photo} alt={photoAlt} />
          ) : (
            <div className="about-section__photo about-section__photo--placeholder">{photoPlaceholder}</div>
          )}
        </div>

        <div className="about-section__content">
          <div className="about-section__intro">
            <p className="section-heading__eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            <p className="about-section__lead">{intro}</p>
          </div>

          <div className="about-section__story">
            <h3>{portfolioTitle}</h3>
            <ParagraphText text={portfolioText} className="about-section__paragraph" />
          </div>
        </div>
      </div>
    </section>
  );
}