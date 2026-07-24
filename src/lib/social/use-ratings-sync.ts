import { useEffect, useRef } from "react";
import { currentAuthor, subscribeAuthor } from "@/lib/theme-auth";
import { fetchMyRatings, upsertRating } from "./ratings-api";
import { mergeServerRatings } from "@/lib/ratings/store";

export function useRatingsSync(): void {
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const handle = currentAuthor()?.handle;
      if (!handle || busy.current) return;
      busy.current = true;
      try {
        const server = await fetchMyRatings();
        if (cancelled) return;
        const { localOnly } = mergeServerRatings(server);
        for (const r of localOnly) {
          void upsertRating({
            itemKey: r.itemKey,
            mediaType: r.mediaType,
            title: r.title,
            poster: r.poster,
            score: r.score,
            review: r.review,
            spoiler: r.spoiler,
          }).catch(() => {});
        }
      } catch {
        /* ignore */
      } finally {
        busy.current = false;
      }
    };
    void load();
    const off = subscribeAuthor(() => void load());
    return () => {
      cancelled = true;
      off();
    };
  }, []);
}
