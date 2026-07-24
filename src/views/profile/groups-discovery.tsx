import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { fetchPublicGroups, type Group } from "@/lib/social/groups";
import { Avatar } from "./profile-bits";
import { PeopleSearchIcon } from "./people-search-icon";

export function GroupsDiscovery({
  onOpenGroup,
  onClose,
}: {
  onOpenGroup: (id: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [topTags, setTopTags] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [more, setMore] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    const ctrl = new AbortController();
    setPhase("loading");
    const id = window.setTimeout(() => {
      fetchPublicGroups({ q: q.trim() || undefined, tag: tag || undefined }, ctrl.signal)
        .then((d) => {
          if (ctrl.signal.aborted) return;
          setGroups(d.groups);
          setTopTags(d.topTags);
          setCursor(d.nextCursor);
          setPhase("ready");
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setPhase("error");
        });
    }, 250);
    return () => {
      ctrl.abort();
      window.clearTimeout(id);
    };
  }, [q, tag]);

  const loadMore = useCallback(() => {
    if (!cursor || more) return;
    setMore(true);
    fetchPublicGroups({ q: q.trim() || undefined, tag: tag || undefined, cursor })
      .then((d) => {
        setGroups((p) => [...p, ...d.groups]);
        setCursor(d.nextCursor);
      })
      .finally(() => setMore(false));
  }, [cursor, more, q, tag]);

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[240] flex items-stretch justify-center bg-canvas/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t("Find a group")}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-in relative m-6 flex max-h-[calc(100vh-3rem)] w-full max-w-[720px] flex-col overflow-hidden rounded-3xl border border-edge-soft bg-surface shadow-[0_30px_120px_-30px_rgba(0,0,0,0.85)]"
      >
        <header className="flex items-center justify-between gap-4 border-b border-edge-soft px-6 py-5">
          <h2 className="flex items-center gap-2.5 font-display text-[22px] font-medium text-ink">
            <PeopleSearchIcon size={24} className="text-ink-muted" /> {t("Find a group")}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("Close")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-edge text-ink-muted transition-colors hover:bg-elevated hover:text-ink"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        <div className="border-b border-edge-soft px-6 py-4">
          <div className="flex items-center gap-2 rounded-full bg-elevated px-4 ring-1 ring-edge-soft focus-within:ring-edge">
            <Search size={16} className="text-ink-subtle" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("Search public groups")}
              className="h-11 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-subtle"
            />
          </div>
          {topTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTag(null)}
                className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${
                  !tag ? "bg-ink text-canvas" : "text-ink-muted ring-1 ring-edge-soft hover:bg-elevated"
                }`}
              >
                {t("All")}
              </button>
              {topTags.map((tg) => (
                <button
                  key={tg}
                  type="button"
                  onClick={() => setTag(tg === tag ? null : tg)}
                  className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${
                    tag === tg ? "bg-ink text-canvas" : "text-ink-muted ring-1 ring-edge-soft hover:bg-elevated"
                  }`}
                >
                  {tg}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {phase === "loading" ? (
            <div className="grid place-items-center py-16 text-ink-subtle">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : phase === "error" ? (
            <p className="py-16 text-center text-[13px] text-ink-subtle">{t("Could not load groups.")}</p>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <PeopleSearchIcon size={40} className="text-ink-subtle" />
              <p className="text-[14px] text-ink-muted">{t("No public groups found")}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => onOpenGroup(g.id)}
                    className="flex items-center gap-3 rounded-[12px] border border-edge-soft bg-canvas/40 p-3 text-start transition-colors hover:bg-elevated"
                  >
                    <Avatar src={g.avatarUrl} size={44} alias={g.name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-ink">{g.name}</div>
                      <div className="truncate text-[12px] text-ink-subtle">
                        {g.memberCount} {g.memberCount === 1 ? t("member") : t("members")}
                        {g.tags.length ? ` · ${g.tags.slice(0, 3).join(", ")}` : ""}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {cursor && (
                <button
                  onClick={loadMore}
                  disabled={more}
                  className="mx-auto mt-4 flex items-center gap-2 rounded-full border border-edge px-5 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink disabled:opacity-50"
                >
                  {more && <Loader2 size={14} className="animate-spin" />}
                  {t("Load more")}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
