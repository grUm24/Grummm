import type { ElementType, ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow: string;
  title?: ReactNode;
  description?: ReactNode;
  titleAs?: ElementType;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  hideEyebrowVisually?: boolean;
  hideDescriptionVisually?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  titleAs: TitleTag = "h2",
  className,
  titleClassName,
  descriptionClassName,
  hideEyebrowVisually = false,
  hideDescriptionVisually = false
}: SectionHeadingProps) {
  const rootClassName = className ? `section-heading ${className}` : "section-heading";
  const hasTitle = !(title === undefined || title === null || title === "");

  return (
    <div className={rootClassName}>
      <div>
        <p className={`section-heading__eyebrow${hideEyebrowVisually ? " sr-only" : ""}`}>{eyebrow}</p>
        {hasTitle ? <TitleTag className={titleClassName}>{title}</TitleTag> : null}
      </div>
      {description ? (
        <p className={[descriptionClassName, hideDescriptionVisually ? "sr-only" : undefined].filter(Boolean).join(" ")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}