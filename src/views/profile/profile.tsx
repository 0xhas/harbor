import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useMangaProgressList } from "@/lib/manga-progress";
import { useWatchedCount } from "@/lib/playback-history";
import { pushStats, useLibraryWatchedCount } from "@/lib/social/stats-sync";
import { useProfiles } from "@/lib/profiles";
import { useSettings } from "@/lib/settings";
import { currentAuthor } from "@/lib/theme-auth";
import { useScrollMemory, useView } from "@/lib/view";
import { consumeProfileEditIntent } from "@/lib/social/open-profile";
import { BadgesRow } from "./badges-row";
import { CommentsSection } from "./comments-section";
import { FriendsPanel } from "./friends-panel";
import { GroupsPanel } from "./groups-panel";
import { SocialsPanel } from "./socials-panel";
import { AboutCard } from "./about-card";
import { RatingsCard } from "./ratings-card";
import { UserRatings } from "@/views/ratings/user-ratings";
import { WatchNowCard } from "./watch-now-card";
import { ProfileHero } from "./profile-hero";
import { ProfileSettings } from "./profile-settings";
import { ScrollToTop } from "./scroll-to-top";
import { ProfileSkeleton } from "./profile-skeleton";
import { ProfileEmpty, ProfileError, ProfilePrivate } from "./profile-states";
import { MyListsShowcase } from "./my-lists-showcase";
import { MyListsPicker } from "./my-lists-picker";
import { LinkOutInterstitial } from "@/components/link-out-interstitial";
import { ProfileViewAll } from "./profile-view-all";
import { RecentActivity } from "./recent-activity";
import { Showcase } from "./showcase";
import { useProfile } from "./use-profile";
import { CanvasCard } from "./customization/canvas-frame";
import { resolveCustomization, useFontLink } from "./customization/apply";

export function ProfileView({
  handle,
  onOpenProfile,
  onOpenMeta,
}: {
  handle: string;
  onOpenProfile?: (handle: string) => void;
  onOpenMeta?: (metaId: string, kind?: string, hint?: { name?: string; poster?: string }) => void;
}) {
  const { goBack } = useView();
  const { authKey, user } = useAuth();
  const { activeProfile } = useProfiles();
  const { settings } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [pickingLists, setPickingLists] = useState(false);
  const [expanded, setExpanded] = useState<null | "lists" | "badges" | "activity">(null);
  const [showRatings, setShowRatings] = useState(false);
  const mangaProgress = useMangaProgressList();
  const watchedCount = useWatchedCount();
  const { state, summary, friends, badges, activity, reload, patchSummary } = useProfile(handle);
  const isOwner = summary?.isOwner ?? false;
  const viewerSignedIn = !!currentAuthor();
  const libWatched = useLibraryWatchedCount(authKey, isOwner);
  const custom = summary ? resolveCustomization(summary) : null;
  useFontLink(custom?.fontHref ?? "");

  useScrollMemory(`profile:${handle}`, scrollRef);

  useEffect(() => {
    if (!isOwner) return;
    const w = Math.max(watchedCount, libWatched);
    pushStats(w > 0 ? w : null, mangaProgress.length);
  }, [isOwner, libWatched, watchedCount, mangaProgress.length]);

  useEffect(() => {
    if (isOwner && consumeProfileEditIntent(handle)) setEditing(true);
  }, [isOwner, handle]);

  if (state === "loading") return <ProfileSkeleton />;
  if (state === "error") return <ProfileError onRetry={reload} onBack={goBack} />;
  if (state === "empty" || !summary) return <ProfileEmpty handle={handle} onBack={goBack} />;

  const locked = summary.private && !summary.isOwner;
  const ownerAvatar = summary.isOwner
    ? activeProfile?.avatar || settings.harborAvatar || user?.avatar || currentAuthor()?.avatar || undefined
    : undefined;
  const heroAvatar = summary.isOwner ? ownerAvatar || summary.avatarUrl : summary.avatarUrl || undefined;
  const heroAvatarFallback = summary.isOwner ? summary.avatarUrl || undefined : undefined;
  const mangaReadCount = summary.isOwner ? mangaProgress.length : undefined;
  const watchedOverride = summary.isOwner ? Math.max(watchedCount, libWatched, summary.counts.watched) : undefined;

  if (editing && summary.isOwner) {
    return <ProfileSettings summary={summary} badges={badges} onClose={() => setEditing(false)} onSaved={patchSummary} />;
  }

  const c = resolveCustomization(summary);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto"
      style={c.background ? { background: c.background } : undefined}
    >
      <ProfileHero
        p={summary}
        avatar={heroAvatar}
        avatarFallback={heroAvatarFallback}
        mangaReadOverride={mangaReadCount}
        watchedOverride={watchedOverride}
        badges={badges}
        userFont={c.font}
        hideBanner={c.hideTopBanner}
        onEdit={() => setEditing(true)}
        onPatch={patchSummary}
      />
      <LinkOutInterstitial />
      <ScrollToTop targetRef={scrollRef} />

      <div className="mx-auto w-full max-w-6xl px-6 pb-16 lg:px-10">
        {locked ? (
          <div className="space-y-6">
            <ProfilePrivate alias={summary.alias} />
            <CommentsSection
              handle={handle}
              isOwner={summary.isOwner}
              signedIn={!!authKey}
              onOpenAuthor={onOpenProfile}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <div className="min-w-0 space-y-6">
              <RatingsCard
                ratings={summary.ratings}
                isOwner={summary.isOwner}
                onViewAll={() => setShowRatings(true)}
                onOpenMeta={onOpenMeta}
              />
              <AboutCard
                description={summary.description}
                isOwner={summary.isOwner}
                userFont={c.font}
                onEdit={() => setEditing(true)}
              />
              {c.hasCanvas && (
                <CanvasCard html={c.html} css={c.css} height={c.height} hiddenFromVisitors={c.hiddenFromVisitors} />
              )}
              <Showcase item={summary.showcase} onOpen={onOpenMeta} isOwner={summary.isOwner} onCleared={patchSummary} />
              <MyListsShowcase
                lists={summary.featuredLists ?? []}
                isOwner={summary.isOwner}
                signedIn={viewerSignedIn}
                onOpenMeta={onOpenMeta}
                onViewAll={() => setExpanded("lists")}
                onManage={() => setPickingLists(true)}
                handle={handle}
              />
              <BadgesRow badges={badges} onViewAll={() => setExpanded("badges")} handle={handle} />
              <RecentActivity
                items={summary.isOwner || summary.activityPublic ? activity : []}
                onOpen={onOpenMeta}
                onViewAll={() => setExpanded("activity")}
                handle={handle}
                visibilityPrivate={!summary.isOwner && !summary.activityPublic}
              />
              <CommentsSection
                handle={handle}
                isOwner={summary.isOwner}
                signedIn={!!authKey}
                onOpenAuthor={onOpenProfile}
              />
            </div>
            <aside className="lg:sticky lg:top-24 lg:self-start space-y-6">
              <WatchNowCard watching={summary.watching} />
              <FriendsPanel friends={friends} onOpen={onOpenProfile} isOwner={summary.isOwner} />
              <GroupsPanel isOwner={summary.isOwner} handle={handle} onOpenProfile={onOpenProfile} />
              <SocialsPanel socials={summary.socials} isOwner={summary.isOwner} onSaved={patchSummary} />
            </aside>
          </div>
        )}
        {expanded && (
          <ProfileViewAll
            section={expanded}
            lists={summary.featuredLists ?? []}
            badges={badges}
            activity={activity}
            signedIn={viewerSignedIn}
            isOwner={summary.isOwner}
            handle={handle}
            onOpenMeta={onOpenMeta}
            onClose={() => setExpanded(null)}
          />
        )}
        {pickingLists && (
          <MyListsPicker
            onClose={() => {
              setPickingLists(false);
              reload();
            }}
          />
        )}
        {showRatings && (
          <UserRatings
            handle={handle}
            alias={summary.alias}
            onOpenMeta={onOpenMeta}
            onClose={() => setShowRatings(false)}
          />
        )}
      </div>
    </div>
  );
}
