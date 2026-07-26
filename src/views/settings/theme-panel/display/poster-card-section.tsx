import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { Section, Segmented } from "../../shared";
import { POSTER_RADII, POSTER_SIZES, PxField, posterSizeKey, radiusKey } from "./poster-options";

export function PosterCardSection({ previewPoster }: { previewPoster: string }) {
  const t = useT();
  const { settings, update } = useSettings();
  const cardW = Math.round(150 * settings.posterScale);
  const cardH = Math.round(225 * settings.posterScale);
  const previewW = Math.min(cardW, 190);
  const tv = settings.rowCardStyle === "tv";

  return (
    <Section
      title={t("Poster card style")}
      subtitle={t("How cards look across Home, Discover, and your library. The preview updates live.")}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="flex shrink-0 flex-col gap-3 rounded-2xl bg-canvas/40 p-4 ring-1 ring-edge-soft lg:w-[218px]">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
            {t("Live preview")}
          </span>
          <div className="flex justify-center py-1">
            <img
              src={previewPoster}
              alt=""
              draggable={false}
              className="aspect-[2/3] object-cover shadow-[0_10px_28px_-10px_rgba(0,0,0,0.65)] transition-[width,border-radius] duration-200"
              style={{ width: previewW, borderRadius: settings.posterRadius }}
            />
          </div>
          <div className="flex flex-col gap-1.5 text-[12.5px]">
            <PxRow label={t("Width")} value={cardW} min={90} max={300} onCommit={(px) => update({ posterScale: Math.round((px / 150) * 100) / 100 })} />
            <PxRow label={t("Height")} value={cardH} min={135} max={450} onCommit={(px) => update({ posterScale: Math.round((px / 225) * 100) / 100 })} />
            <PxRow label={t("Corner radius")} value={settings.posterRadius} min={0} max={40} onCommit={(px) => update({ posterRadius: px })} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col divide-y divide-edge-soft/60">
          <Row label={t("Row card style")} hint={t("TV shows wide art cards with the logo on them. Poster is the classic grid.")}>
            <Segmented
              value={settings.rowCardStyle}
              options={[
                { value: "poster", label: t("Poster") },
                { value: "tv", label: t("TV") },
              ]}
              onChange={(v) => update({ rowCardStyle: v })}
            />
          </Row>

          {tv && (
            <Row label={t("Logo position")} hint={t("Where the logo and poster sit on a TV card.")}>
              <Segmented
                value={settings.tvCardLogoPos}
                options={[
                  { value: "bottomStart", label: t("Start") },
                  { value: "center", label: t("Center") },
                  { value: "bottomEnd", label: t("End") },
                ]}
                onChange={(v) => update({ tvCardLogoPos: v })}
              />
            </Row>
          )}

          <Row label={t("Size")}>
            <Segmented
              value={posterSizeKey(settings.posterScale)}
              options={POSTER_SIZES.map((p) => ({ value: p.value, label: p.label }))}
              onChange={(v) => update({ posterScale: POSTER_SIZES.find((p) => p.value === v)?.scale ?? 1 })}
            />
          </Row>

          <Row label={t("Corner radius")}>
            <Segmented
              value={radiusKey(settings.posterRadius)}
              options={POSTER_RADII.map((p) => ({ value: p.value, label: t(p.label) }))}
              onChange={(v) => update({ posterRadius: POSTER_RADII.find((p) => p.value === v)?.px ?? 12 })}
            />
          </Row>

          <Row label={t("Load effect")} hint={t("Blur up looks smoothest. Fade is lighter on older devices. Instant turns it off.")}>
            <Segmented
              value={settings.posterEffect}
              options={[
                { value: "blur", label: t("Blur up") },
                { value: "fade", label: t("Fade") },
                { value: "off", label: t("Instant") },
              ]}
              onChange={(v) => update({ posterEffect: v as "blur" | "fade" | "off" })}
            />
          </Row>

          <Row label={t("Quality")} hint={t("High is sized to your screen and looks identical to full res on far less memory. Balanced saves the most. Maximum keeps original resolution.")}>
            <Segmented
              value={settings.posterQuality}
              options={[
                { value: "balanced", label: t("Balanced") },
                { value: "high", label: t("High") },
                { value: "max", label: t("Maximum") },
              ]}
              onChange={(v) => update({ posterQuality: v as "balanced" | "high" | "max" })}
            />
          </Row>
        </div>
      </div>
    </Section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 first:pt-0 last:pb-0">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[13.5px] font-medium text-ink">{label}</span>
        {hint && <span className="max-w-[46ch] text-[12px] leading-snug text-ink-subtle">{hint}</span>}
      </span>
      <span className="min-w-0 max-w-full">{children}</span>
    </div>
  );
}

function PxRow({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (px: number) => void;
}) {
  return (
    <span className="flex items-center justify-between gap-3">
      <span className="font-medium text-ink">{label}</span>
      <PxField value={value} min={min} max={max} onCommit={onCommit} />
    </span>
  );
}
