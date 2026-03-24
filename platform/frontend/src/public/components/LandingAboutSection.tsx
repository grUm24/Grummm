import { ParagraphText } from "./ParagraphText";
import { ProgressiveImage } from "./ProgressiveImage";

interface LandingAboutSectionProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  text: string;
  portfolioTitle: string;
  portfolioText: string;
  photo?: string;
  photoAlt?: string;
  photoPlaceholder: string;
}

export function LandingAboutSection({
  eyebrow,
  title,
  subtitle,
  text,
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
            <ProgressiveImage
              className="about-section__photo"
              src={photo}
              alt={photoAlt}
              loading="lazy"
              wrapperClassName="about-section__photo-frame"
            />
          ) : (
            <div className="about-section__photo about-section__photo--placeholder">{photoPlaceholder}</div>
          )}
        </div>

        <div className="about-section__content">
          <div className="about-section__intro">
            <p className="section-heading__eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>

          <div className="about-section__block">
            <h3>{subtitle}</h3>
            <ParagraphText text={text} className="about-section__paragraph" />
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
