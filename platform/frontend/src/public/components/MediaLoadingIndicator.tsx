import grummmLogo from "../../images/grummmLogo.svg";

interface MediaLoadingIndicatorProps {
  className?: string;
  compact?: boolean;
}

export function MediaLoadingIndicator({ className, compact = false }: MediaLoadingIndicatorProps) {
  const classes = ["media-loading-indicator", compact ? "media-loading-indicator--compact" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} aria-hidden="true">
      <span className="media-loading-indicator__glow" />
      <span className="media-loading-indicator__ring" />
      <img src={grummmLogo} alt="" className="media-loading-indicator__logo" />
    </div>
  );
}
