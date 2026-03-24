import { SectionHeading } from "./SectionHeading";

interface ProjectDetailHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  meta?: string;
  metaDateTime?: string;
  tags: string[];
  backLabel: string;
  onBack: () => void;
  actionLabel?: string;
  actionHref?: string;
}

export function ProjectDetailHeader({
  eyebrow,
  title,
  description,
  meta,
  metaDateTime,
  tags: _tags,
  backLabel,
  onBack,
  actionLabel,
  actionHref
}: ProjectDetailHeaderProps) {
  return (
    <header className="detail-header liquid-glass" data-gsap="reveal">
      <div className="liquid-glass__sheen" aria-hidden="true" />
      <div className="liquid-glass__grain" aria-hidden="true" />
      <div className="liquid-glass__content detail-header__shell">
        <div className="detail-header__top">
          <div className="detail-header__heading-wrap">
            <SectionHeading
              eyebrow={eyebrow}
              title={title}
              description={description}
              titleAs="h1"
              className="detail-header__heading"
            />
            {meta ? (
              metaDateTime ? (
                <time className="detail-header__meta" dateTime={metaDateTime}>
                  {meta}
                </time>
              ) : (
                <p className="detail-header__meta">{meta}</p>
              )
            ) : null}
          </div>
        </div>

        <div className="detail-header__actions-row">
          <button className="inline-back detail-header__back" type="button" onClick={onBack} data-gsap-button>
            {backLabel}
          </button>
          {actionLabel && actionHref ? (
            <a className="glass-button detail-header__cta" href={actionHref} target="_blank" rel="noreferrer" data-gsap-button>
              {actionLabel}
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}
