import { SectionHeading } from "./SectionHeading";

interface ProjectDetailHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  tags: string[];
  backLabel: string;
  onBack: () => void;
}

export function ProjectDetailHeader({ eyebrow, title, description, tags: _tags, backLabel, onBack }: ProjectDetailHeaderProps) {
  return (
    <header className="detail-header liquid-glass" data-gsap="reveal">
      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />
      <div className="liquid-glass__content detail-header__shell">
        <div className="detail-header__top">
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            description={description}
            titleAs="h1"
            className="detail-header__heading"
          />
        </div>

        <button className="inline-back detail-header__back" type="button" onClick={onBack} data-gsap-button>
          {backLabel}
        </button>
      </div>
    </header>
  );
}
