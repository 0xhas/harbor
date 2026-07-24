import { useEffect, useMemo, useRef } from "react";
import { currentAuthor, subscribeAuthor } from "@/lib/theme-auth";
import { useContinueWatching } from "@/lib/continue-watching";
import { useMyRatings } from "@/lib/ratings/store";
import { useMediaFavorites } from "@/lib/media-favorites";
import { useMangaFavorites } from "@/lib/manga-favorites";
import { buildActivityFeed, pushActivity, sameFeed, type ActivityFeedItem } from "./activity-feed";

const DEBOUNCE_MS = 2500;

export function useActivitySync(): void {
  const cw = useContinueWatching(undefined, 20);
  const ratings = useMyRatings();
  const { items: favMap } = useMediaFavorites();
  const { items: mangaMap } = useMangaFavorites();

  const feed = useMemo<ActivityFeedItem[]>(
    () =>
      buildActivityFeed({
        cw,
        ratings,
        favorites: [...favMap.values()],
        mangaFavorites: [...mangaMap.values()],
      }),
    [cw, ratings, favMap, mangaMap],
  );

  const lastRef = useRef<ActivityFeedItem[] | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const off = subscribeAuthor(() => {
      lastRef.current = null;
    });
    return off;
  }, []);

  useEffect(() => {
    if (!currentAuthor()) return;
    if (lastRef.current && sameFeed(lastRef.current, feed)) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      lastRef.current = feed;
      void pushActivity(feed).catch(() => {
        lastRef.current = null;
      });
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [feed]);
}
