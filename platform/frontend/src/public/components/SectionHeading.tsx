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
  const headingClassName = ["section-heading__title", titleClassName].filter(Boolean).join(" ");
  const resolvedDescriptionClassName = ["section-heading__description", descriptionClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName}>
      <div className="section-heading__content">
        <p className={`section-heading__eyebrow${hideEyebrowVisually ? " sr-only" : ""}`}>{eyebrow}</p>
        {hasTitle ? <TitleTag className={headingClassName}>{title}</TitleTag> : null}
      </div>
      {description ? (
        <p className={`${resolvedDescriptionClassName}${hideDescriptionVisually ? " sr-only" : ""}`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}