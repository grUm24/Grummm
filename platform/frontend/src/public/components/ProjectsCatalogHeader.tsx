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
    <header className="catalog-header liquid-glass" data-gsap="reveal">
      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />
      <div className="liquid-glass__content catalog-header__shell">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          titleAs="h1"
          className="catalog-header__heading"
        />

        <div className="catalog-header__actions">
          <span className="catalog-header__count">{count}</span>
          <button className="inline-back" type="button" onClick={onBack} data-gsap-button>
            {backLabel}
          </button>
        </div>
      </div>
    </header>
  );
}