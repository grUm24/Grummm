import { useCallback, useRef, useState } from "react";
import { t } from "../../shared/i18n";
import { usePostLike } from "../hooks/usePostLike";

interface PostActionsProps {
  postId: string;
  postTitle: string;
  postUrl: string;
  language: "en" | "ru";
}

type SharePlatformLabelKey =
  | "postActions.platforms.twitter"
  | "postActions.platforms.telegram"
  | "postActions.platforms.vk"
  | "postActions.platforms.linkedin"
  | "postActions.platforms.instagram";

interface SharePlatform {
  key: string;
  labelKey: SharePlatformLabelKey;
  copyOnly?: true;
  buildUrl?: (url: string, title: string) => string;
}

const SHARE_PLATFORMS: SharePlatform[] = [
  {
    key: "vk",
    labelKey: "postActions.platforms.vk",
    buildUrl: (url, title) =>
      `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`
  },
  {
    key: "telegram",
    labelKey: "postActions.platforms.telegram",
    buildUrl: (url, title) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
  },
  {
    key: "twitter",
    labelKey: "postActions.platforms.twitter",
    buildUrl: (url, title) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
  },
  {
    key: "linkedin",
    labelKey: "postActions.platforms.linkedin",
    buildUrl: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
  },
  {
    key: "instagram",
    labelKey: "postActions.platforms.instagram",
    copyOnly: true
  }
];

function buildShareUrl(postUrl: string): string {
  try {
    const url = new URL(postUrl);
    url.searchParams.set("utm_source", "share");
    return url.toString();
  } catch {
    return postUrl;
  }
}

export function PostActions({ postId, postTitle, postUrl, language }: PostActionsProps) {
  const { likeCount, liked, toggle } = usePostLike(postId);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareUrl = buildShareUrl(postUrl);

  function handleShareToggle() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      void navigator.share({ title: postTitle, url: shareUrl }).catch(() => undefined);
      return;
    }
    setShareOpen((prev) => !prev);
  }

  const handleCopyLink = useCallback(() => {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);

  return (
    <div className="post-actions">
      <button
        type="button"
        className={`post-actions__like${liked ? " is-liked" : ""}`}
        onClick={toggle}
        aria-pressed={liked}
        aria-label={liked ? t("postActions.liked", language) : t("postActions.like", language)}
      >
        <span className="post-actions__like-icon" aria-hidden="true">
          {liked ? "♥" : "♡"}
        </span>
        {likeCount > 0 ? (
          <span className="post-actions__like-count">{likeCount}</span>
        ) : null}
        <span className="post-actions__like-label">
          {liked ? t("postActions.liked", language) : t("postActions.like", language)}
        </span>
      </button>

      <div className="post-actions__share-wrap">
        <button
          type="button"
          className={`post-actions__share-btn${shareOpen ? " is-open" : ""}`}
          onClick={handleShareToggle}
          aria-expanded={shareOpen}
          aria-label={t("postActions.shareVia", language)}
        >
          <span className="post-actions__share-icon" aria-hidden="true">↗</span>
          <span className="post-actions__share-label">{t("postActions.share", language)}</span>
        </button>

        {shareOpen ? (
          <div className="post-actions__share-panel" role="menu" aria-label={t("postActions.shareTitle", language)}>
            {SHARE_PLATFORMS.map((platform) =>
              platform.copyOnly ? (
                <button
                  key={platform.key}
                  type="button"
                  className="post-actions__share-link"
                  role="menuitem"
                  onClick={handleCopyLink}
                >
                  {t(platform.labelKey, language)}
                </button>
              ) : (
                <a
                  key={platform.key}
                  href={platform.buildUrl!(shareUrl, postTitle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="post-actions__share-link"
                  role="menuitem"
                >
                  {t(platform.labelKey, language)}
                </a>
              )
            )}
            <button
              type="button"
              className="post-actions__share-link post-actions__share-link--copy"
              role="menuitem"
              onClick={handleCopyLink}
            >
              {copied ? t("postActions.linkCopied", language) : t("postActions.copyLink", language)}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
