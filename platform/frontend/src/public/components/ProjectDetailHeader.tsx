import { LiquidGlass } from "./LiquidGlass";
import { SectionHeading } from "./SectionHeading";

interface ProjectDetailHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  tags: string[];
  backLabel: string;
  onBack: () => void;
}

export function ProjectDetailHeader({ eyebrow, title, description, tags, backLabel, onBack }: ProjectDetailHeaderProps) {
  return (
    <LiquidGlass as="header" className="project-detail__title-card">
      <div className="project-detail__title-row">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          titleAs="h1"
          className="project-detail__section-heading"
        />
        <button className="inline-back" type="button" onClick={onBack}>
          {backLabel}
        </button>
      </div>
      {tags.length > 0 ? (
        <div className="project-detail__tag-row">
          {tags.map((tag) => (
            <span key={tag} className="project-card__tag-pill">{tag}</span>
          ))}
        </div>
      ) : null}
    </LiquidGlass>
  );
}
