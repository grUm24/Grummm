import { ParagraphText } from "./ParagraphText";
import { SectionHeading } from "./SectionHeading";
import { ProgressiveImage } from "./ProgressiveImage";

interface ProjectDetailSummaryProps {
  imageSrc: string;
  imageAlt: string;
  eyebrow: string;
  description: string;
}

export function ProjectDetailSummary({ imageSrc, imageAlt, eyebrow, description }: ProjectDetailSummaryProps) {
  return (
    <section className="detail-summary liquid-glass" data-gsap="reveal">
      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />
      <div className="liquid-glass__content detail-summary__shell">
        <div className="detail-summary__media">
          <ProgressiveImage
            src={imageSrc}
            alt={imageAlt}
            loading="eager"
            fetchPriority="high"
            wrapperClassName="detail-summary__media-frame"
          />
        </div>
        <div className="detail-summary__content">
          <SectionHeading eyebrow={eyebrow} className="detail-summary__heading" />
          <ParagraphText text={description} className="detail-summary__paragraph" />
        </div>
      </div>
    </section>
  );
}
