import { LiquidGlass } from "./LiquidGlass";

interface ProjectNotFoundCardProps {
  title: string;
  actionLabel: string;
  onAction: () => void;
}

export function ProjectNotFoundCard({ title, actionLabel, onAction }: ProjectNotFoundCardProps) {
  return (
    <LiquidGlass as="div" className="project-detail__title-card">
      <h1>{title}</h1>
      <button type="button" className="glass-button" onClick={onAction}>
        {actionLabel}
      </button>
    </LiquidGlass>
  );
}
