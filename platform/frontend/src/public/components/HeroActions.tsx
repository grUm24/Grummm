interface HeroActionItem {
  label: string;
  onClick: () => void;
  variant?: "primary" | "ghost";
}

interface HeroActionsProps {
  actions: HeroActionItem[];
}

export function HeroActions({ actions }: HeroActionsProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="hero__actions" data-gsap="stagger">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          data-gsap-button
          className={action.variant === "ghost" ? "glass-button glass-button--ghost" : "glass-button"}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}