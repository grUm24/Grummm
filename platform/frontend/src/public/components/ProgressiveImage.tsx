import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { MediaLoadingIndicator } from "./MediaLoadingIndicator";

interface ProgressiveImageProps extends ComponentPropsWithoutRef<"img"> {
  wrapperClassName?: string;
  indicatorClassName?: string;
}

export function ProgressiveImage({
  wrapperClassName,
  indicatorClassName,
  className,
  onLoad,
  onError,
  src,
  alt,
  ...imageProps
}: ProgressiveImageProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete) {
      return;
    }

    setLoaded(true);
    setFailed(image.naturalWidth === 0);
  }, [src]);

  const frameClassName = ["media-frame", loaded ? "is-loaded" : "", failed ? "is-failed" : "", wrapperClassName]
    .filter(Boolean)
    .join(" ");
  const imageClassName = ["media-frame__asset", className].filter(Boolean).join(" ");
  const resolvedLoading = imageProps.loading ?? "lazy";
  const resolvedDecoding = imageProps.decoding ?? "async";
  const resolvedFetchPriority = imageProps.fetchPriority ?? (resolvedLoading === "eager" ? "high" : "low");

  return (
    <div className={frameClassName} aria-busy={!loaded && !failed}>
      {!loaded && !failed ? <MediaLoadingIndicator className={indicatorClassName} compact /> : null}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className={imageClassName}
        loading={resolvedLoading}
        decoding={resolvedDecoding}
        fetchPriority={resolvedFetchPriority}
        onLoad={(event) => {
          setLoaded(true);
          setFailed(false);
          onLoad?.(event);
        }}
        onError={(event) => {
          setLoaded(true);
          setFailed(true);
          onError?.(event);
        }}
        {...imageProps}
      />
    </div>
  );
}
