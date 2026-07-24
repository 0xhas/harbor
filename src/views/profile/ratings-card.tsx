import { Star } from "lucide-react";
import { useT } from "@/lib/i18n";
import { SectionHeader } from "./section-header";
import { RatingPoster } from "@/components/ratings/rating-poster";
import type { RatingsSummary } from "@/lib/ratings/types";

export function RatingsCard({
  ratings,
  isOwner,
  onViewAll,
  onOpenMeta,
}: {
  ratings?: RatingsSummary;
  isOwner: boolean;
  onViewAll: () => void;
  onOpenMeta?: (metaId: string, kind?: string, hint?: { name?: string; poster?: string }) => void;
}) {
  const t = useT();
  const count = ratings?.count ?? 0;
  if (!ratings || (count === 0 && !isOwner)) return null;

  return (
    <section aria-label={t("Ratings")} className="rounded-[14px] bg-surface p-5 ring-1 ring-edge-soft">
      <SectionHeader
        icon={<Star size={20} />}
        label={t("Ratings")}
        onViewAll={count > 0 ? onViewAll : undefined}
      />
      {count === 0 ? (
        <p className="py-6 text-center text-[13px] text-ink-subtle">
          {t("Rate movies, shows, anime, and manga to build your ratings")}
        </p>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-baseline gap-1.5">
              <Star size={18} className="translate-y-[3px] fill-current text-ink" />
              <span className="text-[22px] font-bold tabular-nums text-ink">{ratings.avg.toFixed(1)}</span>
              <span className="text-[12px] text-ink-subtle">{t("avg")}</span>
            </div>
            <span className="text-[13px] text-ink-muted">
              <span className="font-semibold tabular-nums text-ink">{count}</span>{" "}
              {count === 1 ? t("rating") : t("ratings")}
            </span>
          </div>
          <div className="-mx-5 flex gap-4 overflow-x-auto px-5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ratings.recent.map((r) => (
              <div key={r.itemKey} className="w-[104px] shrink-0">
                <RatingPoster
                  title={r.title}
                  posterUrl={r.posterUrl}
                  score={r.score}
                  onOpen={
                    onOpenMeta
                      ? () => onOpenMeta(r.itemKey, r.mediaType, { name: r.title, poster: r.posterUrl })
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
