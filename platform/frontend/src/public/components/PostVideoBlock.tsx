import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MediaLoadingIndicator } from "./MediaLoadingIndicator";
import { ParagraphText } from "./ParagraphText";
import { useDeferredMedia } from "../hooks/useDeferredMedia";
import type { Language, PortfolioContentBlock } from "../types";

gsap.registerPlugin(ScrollTrigger);

interface PostVideoBlockProps {
  block: PortfolioContentBlock;
  language: Language;
  title: string;
}

export function PostVideoBlock({ block, language, title }: PostVideoBlockProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const hasAutoplayStartedRef = useRef(false);
  const replayStateRef = useRef(false);
  const [replayVisible, setReplayVisible] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const shouldLoadVideo = useDeferredMedia(rootRef, { rootMargin: "420px 0px" });

  const caption = block.content?.[language] || block.content?.en || block.content?.ru || "";
  const replayLabel = language === "ru" ? "Повтор" : "Replay";

  useLayoutEffect(() => {
    if (!shouldLoadVideo) {
      return;
    }

    const root = rootRef.current;
    const video = videoRef.current;
    if (!root || !video) {
      return;
    }

    const updateReplayVisibility = (value: boolean) => {
      if (replayStateRef.current === value) {
        return;
      }

      replayStateRef.current = value;
      setReplayVisible(value);
    };

    const playOnceInView = () => {
      if (hasAutoplayStartedRef.current) {
        return;
      }

      hasAutoplayStartedRef.current = true;
      updateReplayVisibility(false);
      if (video.currentTime <= 0.04) {
        void video.play().catch(() => undefined);
      }
    };

    const onLoadedMetadata = () => {
      setVideoReady(true);
    };

    const onEnded = () => {
      hasAutoplayStartedRef.current = true;
      updateReplayVisibility(true);
    };

    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ended", onEnded);
    if (video.readyState >= 1) {
      onLoadedMetadata();
    }

    triggerRef.current = ScrollTrigger.create({
      trigger: root,
      start: "top 82%",
      onEnter: playOnceInView,
      onEnterBack: playOnceInView
    });

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("ended", onEnded);
      triggerRef.current?.kill();
      triggerRef.current = null;
    };
  }, [block.videoUrl, shouldLoadVideo]);

  useLayoutEffect(() => {
    hasAutoplayStartedRef.current = false;
    replayStateRef.current = false;
    setReplayVisible(false);
    setVideoReady(false);
  }, [block.videoUrl, shouldLoadVideo]);

  function handleReplay() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    hasAutoplayStartedRef.current = true;
    replayStateRef.current = false;
    setReplayVisible(false);
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }

  return (
    <figure ref={rootRef} className="post-content__block post-content__block--video post-video-block" data-gsap-post-block>
      <div className="post-video-block__media">
        <div className={`post-video-block__frame media-frame media-frame--video ${videoReady ? "is-loaded" : ""}`} aria-busy={!videoReady}>
          {!videoReady ? <MediaLoadingIndicator compact /> : null}
          <video
            ref={videoRef}
            className="post-video-block__video media-frame__asset"
            {...(block.posterUrl ? { poster: block.posterUrl } : {})}
            aria-label={title}
            muted
            playsInline
            preload={shouldLoadVideo ? "metadata" : "none"}
            disablePictureInPicture
            onLoadedData={() => setVideoReady(true)}
            onCanPlay={() => setVideoReady(true)}
            onError={() => setVideoReady(true)}
          >
            {shouldLoadVideo ? <source src={block.videoUrl} /> : null}
          </video>

          {replayVisible ? (
            <button type="button" className="post-video-block__replay" onClick={handleReplay}>
              {replayLabel}
            </button>
          ) : null}
        </div>
      </div>

      {caption.trim() ? <ParagraphText text={caption} className="post-content__paragraph post-video-block__caption" /> : null}
    </figure>
  );
}
