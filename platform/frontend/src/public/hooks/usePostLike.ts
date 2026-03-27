import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "grummm_liked_posts";

function getLikedPosts(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveLikedPosts(liked: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(liked)));
  } catch {
    // localStorage недоступен — игнорируем
  }
}

export interface UsePostLikeResult {
  likeCount: number;
  liked: boolean;
  loading: boolean;
  toggle: () => void;
}

export function usePostLike(postId: string): UsePostLikeResult {
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLiked(getLikedPosts().has(postId));

    let cancelled = false;
    fetch(`/api/public/analytics/likes/${encodeURIComponent(postId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { postId: string; likes: number } | null) => {
        if (!cancelled && data) {
          setLikeCount(data.likes);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [postId]);

  const toggle = useCallback(() => {
    const likedPosts = getLikedPosts();

    if (likedPosts.has(postId)) {
      // Снятие лайка — только локально, счётчик не уменьшаем на сервере
      likedPosts.delete(postId);
      saveLikedPosts(likedPosts);
      setLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
      return;
    }

    likedPosts.add(postId);
    saveLikedPosts(likedPosts);
    setLiked(true);
    setLikeCount((prev) => prev + 1);

    fetch(`/api/public/analytics/like/${encodeURIComponent(postId)}`, {
      method: "POST",
      credentials: "omit"
    }).catch(() => undefined);
  }, [postId]);

  return { likeCount, liked, loading, toggle };
}
