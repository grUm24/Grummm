import { LiquidGlass } from "./LiquidGlass";
import { SectionHeading } from "./SectionHeading";

interface ProjectsCatalogHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  count: number;
  backLabel: string;
  onBack: () => void;
}

export function ProjectsCatalogHeader({ eyebrow, title, description, count, backLabel, onBack }: ProjectsCatalogHeaderProps) {
  return (
    <LiquidGlass as="header" className="projects-page__header projects-page__header--card">
      <div>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          titleAs="h1"
          className="projects-page__heading"
        />
      </div>
      <div className="projects-page__actions">
        <span className="projects-page__count">{count}</span>
        <button className="inline-back" type="button" onClick={onBack}>
          {backLabel}
        </button>
      </div>
    </LiquidGlass>
  );
}
