import { LiquidGlass } from "./LiquidGlass";
import { ParagraphText } from "./ParagraphText";
import { SectionHeading } from "./SectionHeading";

interface ProjectDetailSummaryProps {
  imageSrc: string;
  imageAlt: string;
  eyebrow: string;
  description: string;
}

export function ProjectDetailSummary({ imageSrc, imageAlt, eyebrow, description }: ProjectDetailSummaryProps) {
  return (
    <LiquidGlass as="section" className="project-detail__summary">
      <img src={imageSrc} alt={imageAlt} loading="lazy" />
      <div className="project-detail__text">
        <SectionHeading eyebrow={eyebrow} className="project-detail__section-heading" />
        <ParagraphText text={description} className="project-detail__paragraph" />
      </div>
    </LiquidGlass>
  );
}
