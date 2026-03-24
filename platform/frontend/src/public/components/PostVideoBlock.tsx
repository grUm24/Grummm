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

function clampScrollSpan(value?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 160;
  }

  return Math.min(320, Math.max(80, Math.round(value)));
}

export function PostVideoBlock({ block, language, title }: PostVideoBlockProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const pinFrameRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const replayStateRef = useRef(false);
  const [replayVisible, setReplayVisible] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const shouldLoadVideo = useDeferredMedia(rootRef, { rootMargin: "420px 0px" });

  const caption = block.content?.[language] || block.content?.en || block.content?.ru || "";
  const replayLabel = language === "ru" ? "Повтор" : "Replay";
  const scrollHint = language === "ru" ? "Scroll-сцена на десктопе" : "Scroll-synced scene on desktop";

  useLayoutEffect(() => {
    if (!shouldLoadVideo) {
      return;
    }

    const root = rootRef.current;
    const pinFrame = pinFrameRef.current;
    const video = videoRef.current;
    if (!root || !pinFrame || !video) {
      return;
    }

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const supportsPinnedStory = window.matchMedia?.("(min-width: 960px)").matches ?? false;
    const shouldPin = Boolean(block.pinEnabled && supportsPinnedStory && !prefersReducedMotion);
    const scrollSpan = clampScrollSpan(block.scrollSpan);
    let lastProgress = 0;

    const updateReplayVisibility = (value: boolean) => {
      if (replayStateRef.current === value) {
        return;
      }

      replayStateRef.current = value;
      setReplayVisible(value);
    };

    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const syncToProgress = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        return;
      }

      const duration = video.duration;
      const targetTime = Math.min(Math.max(lastProgress * duration, 0), Math.max(duration - 0.04, 0));
      if (Math.abs(video.currentTime - targetTime) > 0.03) {
        video.currentTime = targetTime;
      }
    };

    const onLoadedMetadata = () => {
      setVideoReady(true);
      video.pause();
      syncToProgress();
      ScrollTrigger.refresh();
    };

    const onEnded = () => updateReplayVisibility(true);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ended", onEnded);
    if (video.readyState >= 1) {
      onLoadedMetadata();
    }

    const ctx = gsap.context(() => {
      if (shouldPin) {
        triggerRef.current = ScrollTrigger.create({
          trigger: root,
          start: "top top+=96",
          end: () => `+=${Math.round(window.innerHeight * (scrollSpan / 100))}`,
          pin: pinFrame,
          pinSpacing: true,
          scrub: 0.18,
          anticipatePin: 1,
          onEnter: () => updateReplayVisibility(false),
          onEnterBack: () => updateReplayVisibility(false),
          onUpdate: (self) => {
            lastProgress = self.progress;
            video.pause();
            syncToProgress();
            updateReplayVisibility(self.progress >= 0.995);
          },
          onLeaveBack: () => {
            lastProgress = 0;
            updateReplayVisibility(false);
            if (Number.isFinite(video.duration)) {
              video.currentTime = 0;
            }
          }
        });

        return;
      }

      const playInView = () => {
        updateReplayVisibility(false);
        void video.play().catch(() => undefined);
      };

      triggerRef.current = ScrollTrigger.create({
        trigger: root,
        start: "top 82%",
        end: "bottom 18%",
        onEnter: playInView,
        onEnterBack: playInView,
        onLeave: () => video.pause(),
        onLeaveBack: () => video.pause()
      });
    }, root);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("ended", onEnded);
      triggerRef.current?.kill();
      triggerRef.current = null;
      ctx.revert();
    };
  }, [block.pinEnabled, block.scrollSpan, block.videoUrl, shouldLoadVideo]);

  useLayoutEffect(() => {
    setVideoReady(false);
  }, [block.videoUrl, shouldLoadVideo]);

  function handleReplay() {
    const video = videoRef.current;
    const trigger = triggerRef.current;
    if (!video) {
      return;
    }

    replayStateRef.current = false;
    setReplayVisible(false);
    video.currentTime = 0;

    if (block.pinEnabled && trigger) {
      window.scrollTo({ top: Math.max(trigger.start - 24, 0), behavior: "smooth" });
      return;
    }

    void video.play().catch(() => undefined);
  }

  return (
    <figure ref={rootRef} className="post-content__block post-content__block--video post-video-block" data-gsap-post-block>
      <div className="post-video-block__media">
        <div
          ref={pinFrameRef}
          className={`post-video-block__frame media-frame media-frame--video ${videoReady ? "is-loaded" : ""}`}
          aria-busy={!videoReady}
        >
          {!videoReady ? <MediaLoadingIndicator compact /> : null}
          <video
            ref={videoRef}
            className="post-video-block__video media-frame__asset"
            poster={block.posterUrl}
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

      {block.pinEnabled ? <p className="post-video-block__hint">{scrollHint}</p> : null}
      {caption.trim() ? <ParagraphText text={caption} className="post-content__paragraph post-video-block__caption" /> : null}
    </figure>
  );
}
