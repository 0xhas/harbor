import { socialGet, socialPost, socialPatch } from "./client";
import { authToken } from "@/lib/theme-auth";

const API = "https://harbor.site/themes/api";

export type GroupMember = {
  userId: string;
  handle: string;
  alias: string;
  avatarUrl?: string;
  slogan?: string;
  online?: boolean;
  role: "owner" | "member";
};

export type GroupVisibility = "public" | "invite";

export type Group = {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  visibility: GroupVisibility;
  tags: string[];
  ownerId: string;
  memberCount: number;
  createdAt: string;
  isOwner: boolean;
  isMember: boolean;
};

export type GroupDetail = Group & { members: GroupMember[] };

export type DiscoverGroups = { groups: Group[]; topTags: string[]; nextCursor?: string; total: number };

export function createGroup(
  name: string,
  opts?: { description?: string; visibility?: GroupVisibility; tags?: string[] },
): Promise<GroupDetail> {
  return socialPost<GroupDetail>("/social/groups", {
    name: name.trim(),
    description: opts?.description?.trim(),
    visibility: opts?.visibility,
    tags: opts?.tags,
  });
}

export function editGroup(
  id: string,
  patch: { name?: string; description?: string; visibility?: GroupVisibility; tags?: string[] },
): Promise<GroupDetail> {
  return socialPatch<GroupDetail>(`/social/groups/${encodeURIComponent(id)}`, patch);
}

export function fetchPublicGroups(
  opts: { q?: string; tag?: string; cursor?: string } = {},
  signal?: AbortSignal,
): Promise<DiscoverGroups> {
  const p = new URLSearchParams();
  if (opts.q) p.set("q", opts.q);
  if (opts.tag) p.set("tag", opts.tag);
  if (opts.cursor) p.set("cursor", opts.cursor);
  const qs = p.toString();
  return socialGet<DiscoverGroups>(`/social/groups/discover${qs ? `?${qs}` : ""}`, signal);
}

export function fetchMyGroups(signal?: AbortSignal): Promise<Group[]> {
  return socialGet<{ groups?: Group[] } | Group[]>("/social/groups/mine", signal).then((d) =>
    Array.isArray(d) ? d : d.groups ?? [],
  );
}

export function fetchUserGroups(handle: string, signal?: AbortSignal): Promise<Group[]> {
  return socialGet<Group[]>(`/social/groups/user/${encodeURIComponent(handle)}`, signal);
}

export function fetchGroup(id: string, signal?: AbortSignal): Promise<GroupDetail> {
  return socialGet<GroupDetail>(`/social/groups/${encodeURIComponent(id)}`, signal);
}

export function joinGroup(id: string): Promise<GroupDetail> {
  return socialPost<GroupDetail>(`/social/groups/${encodeURIComponent(id)}/join`);
}

export function leaveGroup(id: string): Promise<{ ok: boolean }> {
  return socialPost<{ ok: boolean }>(`/social/groups/${encodeURIComponent(id)}/leave`);
}

export function removeMember(id: string, userId: string): Promise<GroupDetail> {
  return socialPost<GroupDetail>(`/social/groups/${encodeURIComponent(id)}/remove`, { userId });
}

export function addGroupMember(id: string, handle: string): Promise<GroupDetail> {
  return socialPost<GroupDetail>(`/social/groups/${encodeURIComponent(id)}/add`, { handle });
}

export async function deleteGroup(id: string): Promise<{ ok: boolean }> {
  const token = authToken();
  const r = await fetch(`${API}/social/groups/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!r.ok) throw new Error(d.error || "Could not delete group.");
  return { ok: d.ok !== false };
}

export async function setGroupAvatar(id: string, blob: Blob): Promise<GroupDetail> {
  const token = authToken();
  const fd = new FormData();
  fd.append("avatar", blob, "avatar.webp");
  const r = await fetch(`${API}/social/groups/${encodeURIComponent(id)}/avatar`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const d = (await r.json().catch(() => ({}))) as GroupDetail & { error?: string };
  if (!r.ok) throw new Error(d.error || "Could not update group photo.");
  return d;
}
