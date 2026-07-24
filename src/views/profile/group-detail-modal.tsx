import { Camera, Loader2, LogOut, Trash2, UserPlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  deleteGroup,
  editGroup,
  fetchGroup,
  joinGroup,
  leaveGroup,
  removeMember,
  setGroupAvatar,
  type GroupDetail,
  type GroupMember,
  type GroupVisibility,
} from "@/lib/social/groups";
import { useT } from "@/lib/i18n";
import { Avatar } from "./profile-bits";
import { fileToWebp } from "./group-image-utils";
import { GroupTagsInput } from "./group-tags-input";
import { VisibilityToggle } from "./group-visibility-toggle";
import { InviteMemberModal } from "./invite-member-modal";

function MemberRow({
  member,
  canRemove,
  onOpen,
  onRemove,
}: {
  member: GroupMember;
  canRemove: boolean;
  onOpen?: (h: string) => void;
  onRemove: () => void;
}) {
  const t = useT();
  return (
    <div className="flex items-center gap-3 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-elevated/60">
      <button
        onClick={() => onOpen?.(member.handle)}
        className="flex min-w-0 flex-1 items-center gap-3 text-start"
      >
        <Avatar src={member.avatarUrl} size={40} online={member.online} alias={member.alias} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-ink">{member.alias}</div>
          <div className="truncate text-[12px] text-ink-subtle">@{member.handle}</div>
        </div>
      </button>
      {member.role === "owner" ? (
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">{t("Owner")}</span>
      ) : canRemove ? (
        <button
          onClick={onRemove}
          aria-label={t("Remove {alias}", { alias: member.alias })}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-subtle transition-colors hover:bg-danger/15 hover:text-danger"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}

export function GroupDetailModal({
  id,
  onClose,
  onChanged,
  onOpenProfile,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
  onOpenProfile?: (h: string) => void;
}) {
  const t = useT();
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vis, setVis] = useState<GroupVisibility>("invite");
  const [tags, setTags] = useState<string[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const settingsDirty =
    !!detail &&
    (vis !== detail.visibility || tags.join("|") !== detail.tags.join("|"));

  const saveSettings = async () => {
    if (savingSettings) return;
    setSavingSettings(true);
    setError(null);
    try {
      const updated = await editGroup(id, { visibility: vis, tags });
      setDetail(updated);
      onChanged();
    } catch (e) {
      setError((e as Error).message || t("Could not save changes."));
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const ctrl = new AbortController();
    setPhase("loading");
    fetchGroup(id, ctrl.signal)
      .then((g) => {
        if (ctrl.signal.aborted) return;
        setDetail(g);
        setVis(g.visibility);
        setTags(g.tags);
        setPhase("ready");
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setPhase("error");
      });
    return () => ctrl.abort();
  }, [id]);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      setDetail(await joinGroup(id));
      onChanged();
    } catch (e) {
      setError((e as Error).message || t("Could not join."));
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    setError(null);
    try {
      await leaveGroup(id);
      onChanged();
      onClose();
    } catch (e) {
      setError((e as Error).message || t("Could not leave."));
      setBusy(false);
    }
  };

  const remove = async (userId: string) => {
    setBusy(true);
    setError(null);
    try {
      setDetail(await removeMember(id, userId));
      onChanged();
    } catch (e) {
      setError((e as Error).message || t("Could not remove member."));
    } finally {
      setBusy(false);
    }
  };

  const changePhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setError(null);
    try {
      const blob = await fileToWebp(file, 512);
      setDetail(await setGroupAvatar(id, blob));
      onChanged();
    } catch (e) {
      setError((e as Error).message || t("Could not update group photo."));
    } finally {
      setPhotoBusy(false);
    }
  };

  const destroy = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteGroup(id);
      onChanged();
      onClose();
    } catch (e) {
      setError((e as Error).message || t("Could not delete group."));
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[230] flex items-start justify-center bg-canvas/80 p-4 pt-[10vh]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-in flex max-h-[80vh] w-[min(94vw,480px)] flex-col rounded-2xl border border-edge-soft bg-elevated shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          {phase === "ready" && detail ? (
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative shrink-0">
                <Avatar src={detail.avatarUrl} size={56} alias={detail.name} />
                {detail.isOwner && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={photoBusy}
                      aria-label={detail.avatarUrl ? t("Change group photo") : t("Add group photo")}
                      className="absolute -bottom-1 -end-1 grid h-7 w-7 place-items-center rounded-full bg-elevated text-ink-muted ring-1 ring-edge-soft transition-colors hover:bg-raised hover:text-ink disabled:opacity-60"
                    >
                      {photoBusy ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        void changePhoto(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-display text-[19px] font-medium text-ink">{detail.name}</h2>
                <p className="text-[12px] text-ink-subtle">
                  {detail.memberCount} {detail.memberCount === 1 ? t("member") : t("members")}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-14" />
          )}
          <button
            onClick={onClose}
            aria-label={t("Close")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-subtle transition-colors hover:bg-raised hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {phase === "loading" && (
          <div className="grid place-items-center py-16 text-ink-subtle">
            <Loader2 size={22} className="animate-spin" />
          </div>
        )}

        {phase === "error" && (
          <p className="px-5 py-16 text-center text-[13px] text-ink-subtle">{t("This group could not be loaded.")}</p>
        )}

        {phase === "ready" && detail && (
          <>
            {detail.description && (
              <p className="px-5 pt-3 text-[13px] leading-relaxed text-ink-muted">{detail.description}</p>
            )}

            {detail.isOwner ? (
              <div className="flex flex-col gap-3 px-5 pt-3">
                <VisibilityToggle value={vis} onChange={setVis} />
                <GroupTagsInput tags={tags} onChange={setTags} />
                {settingsDirty && (
                  <button
                    onClick={() => void saveSettings()}
                    disabled={savingSettings}
                    className="inline-flex min-h-9 items-center gap-2 self-start rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {savingSettings && <Loader2 size={14} className="animate-spin" />} {t("Save changes")}
                  </button>
                )}
              </div>
            ) : (
              (detail.visibility === "public" || detail.tags.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 px-5 pt-3">
                  {detail.visibility === "public" && (
                    <span className="rounded-full bg-elevated px-2.5 py-1 text-[11.5px] font-medium text-ink-muted">
                      {t("Public group")}
                    </span>
                  )}
                  {detail.tags.map((tg) => (
                    <span key={tg} className="rounded-full bg-elevated px-2.5 py-1 text-[11.5px] font-medium text-ink-muted">
                      {tg}
                    </span>
                  ))}
                </div>
              )
            )}

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[11px] uppercase tracking-[0.1em] text-ink-subtle">{t("Members")}</span>
                {detail.isOwner && (
                  <button
                    onClick={() => setInviting(true)}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium text-ink-muted transition-colors hover:bg-elevated/60 hover:text-ink"
                  >
                    <UserPlus size={14} /> {t("Invite member")}
                  </button>
                )}
              </div>
              {detail.members.map((m) => (
                <MemberRow
                  key={m.userId}
                  member={m}
                  canRemove={detail.isOwner}
                  onOpen={onOpenProfile}
                  onRemove={() => void remove(m.userId)}
                />
              ))}
            </div>

            {error && (
              <p className="mx-5 mb-1 rounded-lg bg-danger/15 px-3 py-2 text-[12.5px] text-danger">{error}</p>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-edge-soft px-5 py-4">
              {detail.isOwner ? (
                confirmingDelete ? (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-[13px] text-ink-muted">{t("Delete this group for everyone?")}</span>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => setConfirmingDelete(false)}
                        className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-[14px] font-medium text-ink-muted transition-colors hover:bg-surface"
                      >
                        {t("Keep")}
                      </button>
                      <button
                        onClick={() => void destroy()}
                        disabled={busy}
                        className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-danger px-4 text-[14px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {busy && <Loader2 size={16} className="animate-spin" />} {t("Delete")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-[14px] font-medium text-ink-muted transition-colors hover:bg-danger/15 hover:text-danger"
                  >
                    <Trash2 size={17} /> {t("Delete group")}
                  </button>
                )
              ) : detail.isMember ? (
                <button
                  onClick={() => void leave()}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-[14px] font-medium text-ink-muted transition-colors hover:bg-danger/15 hover:text-danger disabled:opacity-50"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={17} />} {t("Leave group")}
                </button>
              ) : (
                <button
                  onClick={() => void join()}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-accent px-5 text-[14px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={17} />} {t("Join group")}
                </button>
              )}
            </div>
          </>
        )}

        {inviting && detail && (
          <InviteMemberModal
            groupId={id}
            existingHandles={detail.members.map((m) => m.handle)}
            onClose={() => setInviting(false)}
            onChanged={(d) => {
              setDetail(d);
              onChanged();
            }}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
