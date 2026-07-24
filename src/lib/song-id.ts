import { invoke } from "@tauri-apps/api/core";

export type SongResult = {
  title: string;
  artist: string;
  album: string;
  artwork: string;
  link: string;
} | null;

export type SongIdToastMsg = {
  kind: "info" | "result" | "error";
  title: string;
  body?: string;
  art?: string;
  href?: string;
};

const TOAST_EVENT = "harbor:song-id-toast";

function toast(msg: SongIdToastMsg): void {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: msg }));
}

export function onSongIdToast(cb: (msg: SongIdToastMsg) => void): () => void {
  const h = (e: Event) => cb((e as CustomEvent<SongIdToastMsg>).detail);
  window.addEventListener(TOAST_EVENT, h);
  return () => window.removeEventListener(TOAST_EVENT, h);
}

function youtubeSearchUrl(artist: string, title: string): string {
  const q = [artist, title].filter(Boolean).join(" ").trim();
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
}

let busy = false;

export function isIdentifying(): boolean {
  return busy;
}

export type SongIdOptions = {
  provider: "audd" | "ai";
  auddKey: string;
  aiKey: string;
  aiModel: string;
};

function showResult(res: SongResult): void {
  if (!res) {
    toast({ kind: "error", title: "Couldn't identify the song" });
    return;
  }
  toast({
    kind: "result",
    title: res.title,
    body: `${res.artist}${res.album ? " · " + res.album : ""}`,
    art: res.artwork || undefined,
    href: youtubeSearchUrl(res.artist, res.title),
  });
}

export async function identifyNowPlaying(opts: SongIdOptions): Promise<void> {
  if (busy) return;
  const useAi = opts.provider === "ai";
  const key = ((useAi ? opts.aiKey : opts.auddKey) ?? "").trim();
  if (!key) {
    toast({
      kind: "error",
      title: useAi ? "Missing Gemini API key" : "Missing AudD key",
      body: "Add it in Settings → Library & metadata",
    });
    return;
  }
  busy = true;
  toast({ kind: "info", title: "Listening…" });
  try {
    const res = useAi
      ? await invoke<SongResult>("recognize_now_playing_ai", {
          apiKey: key,
          model: (opts.aiModel ?? "").trim() || null,
          seconds: 8,
        })
      : await invoke<SongResult>("recognize_now_playing", { apiToken: key, seconds: 7 });
    showResult(res);
  } catch (e) {
    console.error("song-id failed", e);
    toast({ kind: "error", title: "Song identification failed" });
  } finally {
    busy = false;
  }
}
