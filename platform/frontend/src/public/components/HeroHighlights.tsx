interface HeroHighlightsProps {
  items: string[];
  ariaLabel: string;
}

export function HeroHighlights({ items, ariaLabel }: HeroHighlightsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="hero__highlights" aria-label={ariaLabel}>
      {items.map((item) => (
        <span key={item} className="hero__highlight-pill">
          {item}
        </span>
      ))}
    </div>
  );
}
