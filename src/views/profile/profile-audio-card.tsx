import { useEffect, useRef, useState } from "react";
import { Music2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { openLinkOut } from "@/lib/social/link-out";
import {
  fetchAudioMeta,
  parseProfileAudio,
  sendAudioCommand,
  type AudioMeta,
} from "@/lib/social/profile-audio";

export function ProfileAudioCard({ audioUrl }: { audioUrl?: string }) {
  const t = useT();
  const { settings, update } = useSettings();
  const mode = settings.profileAudio ?? "auto";
  const [meta, setMeta] = useState<AudioMeta | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const audio = audioUrl ? parseProfileAudio(audioUrl, { autoplay: true }) : null;

  useEffect(() => {
    setPlaying(false);
    setMuted(false);
    setMeta(null);
    if (!audio) return;
    const ctrl = new AbortController();
    void fetchAudioMeta(audio, ctrl.signal).then((m) => {
      if (!ctrl.signal.aborted) setMeta(m);
    });
    return () => ctrl.abort();
  }, [audioUrl]);

  useEffect(() => {
    if (audio && mode === "auto") setPlaying(true);
  }, [audioUrl, mode]);

  useEffect(() => {
    if (!playing) return;
    sendAudioCommand(frameRef.current, audio?.provider ?? "youtube", muted ? "mute" : "unmute");
  }, [muted, playing]);

  if (!audio || mode === "off") return null;

  const title = meta?.title || t("Now playing");
  const isSpotify = audio.provider === "spotify";

  return (
    <section
      aria-label={t("Profile song")}
      className="relative overflow-hidden rounded-[14px] bg-surface ring-1 ring-edge-soft"
    >
      {isSpotify ? (
        <iframe
          src={audio.embedSrc}
          title={title}
          loading="lazy"
          allow="encrypted-media; clipboard-write"
          referrerPolicy="strict-origin-when-cross-origin"
          className="block h-[152px] w-full border-0"
        />
      ) : (
        <>
          <div className="flex items-center gap-3 p-3">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? t("Pause") : t("Play")}
              className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-elevated ring-1 ring-edge-soft"
            >
              {meta?.thumbnail ? (
                <img src={meta.thumbnail} alt="" draggable={false} className="h-full w-full object-cover" />
              ) : (
                <Music2 size={18} className="text-ink-subtle" />
              )}
              <span className="absolute inset-0 grid place-items-center bg-canvas/55 opacity-0 transition-opacity hover:opacity-100">
                {playing ? <Pause size={16} className="text-ink" /> : <Play size={16} className="text-ink" />}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openLinkOut(audio.url)}
              className="min-w-0 flex-1 text-start"
            >
              <span className="block truncate text-[13px] font-semibold text-ink">{title}</span>
              <span className="block truncate text-[11.5px] text-ink-subtle">
                {meta?.author || (audio.provider === "youtube" ? "YouTube" : "SoundCloud")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? t("Unmute") : t("Mute")}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-subtle transition-colors hover:bg-elevated hover:text-ink"
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>

          {playing && mode === "auto" && (
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                update({ profileAudio: "click" });
              }}
              className="w-full border-t border-edge-soft/60 px-3 py-1.5 text-[11px] text-ink-subtle transition-colors hover:text-ink"
            >
              {t("Never autoplay profile songs")}
            </button>
          )}

          {playing && (
            <iframe
              ref={frameRef}
              src={audio.embedSrc}
              title={title}
              allow="autoplay; encrypted-media"
              referrerPolicy="strict-origin-when-cross-origin"
              aria-hidden
              tabIndex={-1}
              className="pointer-events-none absolute h-px w-px opacity-0"
            />
          )}
        </>
      )}
    </section>
  );
}
