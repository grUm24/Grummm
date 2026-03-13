import type { TouchEventHandler } from "react";

interface ProjectLightboxProps {
  imageSrc: string;
  imageAlt: string;
  zoom: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onTouchStart: TouchEventHandler<HTMLDivElement>;
  onTouchEnd: TouchEventHandler<HTMLDivElement>;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
}

export function ProjectLightbox({
  imageSrc,
  imageAlt,
  zoom,
  onClose,
  onPrev,
  onNext,
  onTouchStart,
  onTouchEnd,
  onZoomOut,
  onResetZoom,
  onZoomIn
}: ProjectLightboxProps) {
  return (
    <div className="project-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="project-lightbox__content"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button type="button" className="project-lightbox__close" onClick={onClose}>
          x
        </button>
        <button type="button" className="project-lightbox__nav project-lightbox__nav--prev" onClick={onPrev}>
          {"<"}
        </button>
        <img src={imageSrc} alt={imageAlt} style={{ transform: `scale(${zoom})` }} />
        <button type="button" className="project-lightbox__nav project-lightbox__nav--next" onClick={onNext}>
          {">"}
        </button>
        <div className="project-lightbox__toolbar">
          <button type="button" onClick={onZoomOut}>-</button>
          <button type="button" onClick={onResetZoom}>100%</button>
          <button type="button" onClick={onZoomIn}>+</button>
        </div>
      </div>
    </div>
  );
}
