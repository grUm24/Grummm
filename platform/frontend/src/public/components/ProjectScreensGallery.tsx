import { LiquidGlass } from "./LiquidGlass";
import { ProgressiveImage } from "./ProgressiveImage";
import type { ThemedAsset, ThemeMode } from "../types";

interface ProjectScreensGalleryProps {
  projectId: string;
  title: string;
  theme: ThemeMode;
  screenshots: ThemedAsset[];
  onOpen: (index: number) => void;
}

export function ProjectScreensGallery({ projectId, title, theme, screenshots, onOpen }: ProjectScreensGalleryProps) {
  return (
    <section className="project-detail__screens">
      {screenshots.map((screen, index) => {
        const src = screen[theme];
        return (
          <LiquidGlass
            key={`${projectId}-screen-${index}`}
            as="button"
            type="button"
            className="project-detail__screen-button"
            onClick={() => onOpen(index)}
          >
            <ProgressiveImage
              src={src}
              alt={`${title} ${index + 1}`}
              loading="lazy"
              wrapperClassName="project-detail__screen-media"
            />
          </LiquidGlass>
        );
      })}
    </section>
  );
}
