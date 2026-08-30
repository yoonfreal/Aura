import { supabase } from '@/lib/supabase';
import {
  notifyComment,
  notifyFriendsOfPost,
  notifyReaction,
} from '@/lib/notifications';
import { addDaysToISO, thailandDateISO } from '@/lib/thailandTime';
import { MISSION_TYPE_ICON } from '@/lib/missionIcons';
import type { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { MissionType } from '@/types';

type ProfileNameRow = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
};

function displayName(p: ProfileNameRow | undefined): string {
  if (!p) return 'Unknown';
  return p.username || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown';
}

async function fetchAcceptedFriendIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  return ((data ?? []) as { requester_id: string; addressee_id: string }[]).map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id,
  );
}

export type AchievementKind = 'mission' | 'badge' | 'challenge_win' | 'stat';

export type AchievementCandidate = {
  kind: AchievementKind;
  title: string;
  icon: string;
  // Set only for the fixed stat candidates below (icon is then an Ionicons name, not an
  // emoji) — mission/badge/challenge icons stay plain emoji since those come from the DB
  // (admin-chosen) and can't be mapped to a fixed icon set.
  iconKind?: 'ionicon';
  iconColor?: string;
  // null for stat candidates — sharing "today's steps" or "current streak" isn't itself an
  // XP-earning event, unlike a mission/badge/challenge win.
  xp: number | null;
  // Sort key only — never shown to the user, since mission completions only carry a date
  // (no time), so this is a same-day anchor, not a real moment.
  sortKey: string;
};

type TodayStatsRow = { steps: number; calories: number };
type ProfileStatRow = { streak_days: number | null; level: number | null };

// Candidates for the Achievement post picker built from the user's own current stats —
// today's steps/calories, active streak, current level — not tied to any specific
// mission/challenge event, so someone can share "how they're doing" even with nothing
// freshly completed.
async function fetchStatCandidates(userId: string): Promise<AchievementCandidate[]> {
  const today = thailandDateISO();
  // Anchored to the start of today, not the exact current instant — using "now" would always
  // outrank a mission or challenge win from earlier today (those anchor at noon / their real
  // completion time), which broke "most recent first" ordering. This still ranks below any
  // actual completion from today while staying above anything from a prior day.
  const todayStart = `${today}T00:00:00.000Z`;

  const [{ data: statsData }, { data: profileData }] = await Promise.all([
    supabase.from('daily_stats').select('steps, calories').eq('user_id', userId).eq('date', today).maybeSingle(),
    supabase.from('profiles').select('streak_days, level').eq('id', userId).single(),
  ]);

  const stats = statsData as TodayStatsRow | null;
  const profile = profileData as ProfileStatRow | null;
  const candidates: AchievementCandidate[] = [];

  if (stats?.steps) {
    candidates.push({
      kind: 'stat',
      title: `Walked ${stats.steps.toLocaleString()} steps today`,
      icon: 'footsteps-outline',
      iconKind: 'ionicon',
      iconColor: '#1B2B4B',
      xp: null,
      sortKey: todayStart,
    });
  }
  if (stats?.calories) {
    candidates.push({
      kind: 'stat',
      title: `Burned ${stats.calories.toLocaleString()} calories today`,
      icon: 'flame-outline',
      iconKind: 'ionicon',
      iconColor: '#F59E0B',
      xp: null,
      sortKey: todayStart,
    });
  }
  if (profile?.streak_days) {
    candidates.push({
      kind: 'stat',
      title: `On a ${profile.streak_days}-day streak`,
      icon: 'flame',
      iconKind: 'ionicon',
      iconColor: '#EF4444',
      xp: null,
      sortKey: todayStart,
    });
  }
  if (profile?.level && profile.level > 1) {
    candidates.push({
      kind: 'stat',
      title: `Reached Level ${profile.level}`,
      icon: 'star',
      iconKind: 'ionicon',
      iconColor: '#F5B800',
      xp: null,
      sortKey: todayStart,
    });
  }

  return candidates;
}

type RecentMissionRow = {
  date: string;
  missions:
    | { title: string; xp_reward: number; goal_unit: MissionType }
    | { title: string; xp_reward: number; goal_unit: MissionType }[]
    | null;
};

type RecentHistoryRow = {
  won: boolean;
  xp_earned: number;
  badge_name: string | null;
  badge_icon: string | null;
  archived_at: string;
  challenges: { title: string; icon: string } | { title: string; icon: string }[] | null;
};

// Candidates for the Achievement post picker: completed missions and challenge wins/badges
// from the last `days` days, plus the user's own current stats (steps/calories/streak/level)
// so there's always something to share even with nothing freshly completed. Newest first.
export async function fetchRecentAchievements(userId: string, days = 3): Promise<AchievementCandidate[]> {
  const since = addDaysToISO(thailandDateISO(), -days);

  const [missionsRes, historyRes, statCandidates] = await Promise.all([
    supabase
      .from('user_missions')
      .select('date, missions(title, xp_reward, goal_unit)')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('date', since)
      .order('date', { ascending: false }),
    supabase
      .from('challenge_history')
      .select('won, xp_earned, badge_name, badge_icon, archived_at, challenges(title, icon)')
      .eq('user_id', userId)
      .eq('won', true)
      .gte('archived_at', since)
      .order('archived_at', { ascending: false }),
    fetchStatCandidates(userId),
  ]);

  const missionItems: AchievementCandidate[] = ((missionsRes.data ?? []) as RecentMissionRow[])
    .map((r) => ({ ...r, missions: Array.isArray(r.missions) ? r.missions[0] : r.missions }))
    .filter(
      (r): r is RecentMissionRow & { missions: { title: string; xp_reward: number; goal_unit: MissionType } } =>
        !!r.missions
    )
    .map((r) => ({
      kind: 'mission' as const,
      title: `Completed ${r.missions.title}`,
      icon: MISSION_TYPE_ICON[r.missions.goal_unit].icon,
      iconKind: 'ionicon' as const,
      iconColor: MISSION_TYPE_ICON[r.missions.goal_unit].color,
      xp: r.missions.xp_reward,
      sortKey: `${r.date}T12:00:00.000Z`,
    }));

  const historyItems: AchievementCandidate[] = ((historyRes.data ?? []) as RecentHistoryRow[])
    .map((r) => ({ ...r, challenges: Array.isArray(r.challenges) ? r.challenges[0] : r.challenges }))
    .map((r) => ({
      kind: r.badge_name ? ('badge' as const) : ('challenge_win' as const),
      title: r.badge_name ? `Earned the ${r.badge_name} badge` : `Won ${r.challenges?.title ?? 'a challenge'}`,
      icon: r.badge_icon || r.challenges?.icon || '🏆',
      xp: r.xp_earned,
      sortKey: r.archived_at,
    }));

  return [...statCandidates, ...missionItems, ...historyItems].sort(
    (a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime(),
  );
}

export type PostType = 'achievement' | 'thoughts' | 'partner';

export type ActivityTypeOption =
  | { value: string; label: string; iconSet: 'material'; icon: keyof typeof MaterialCommunityIcons.glyphMap }
  | { value: string; label: string; iconSet?: undefined; icon: keyof typeof Ionicons.glyphMap };

export const ACTIVITY_TYPES: ActivityTypeOption[] = [
  { value: 'badminton', label: 'Badminton', iconSet: 'material', icon: 'badminton' },
  { value: 'basketball', label: 'Basketball', icon: 'basketball-outline' },
  { value: 'cycling', label: 'Cycling', icon: 'bicycle-outline' },
  { value: 'football', label: 'Football', icon: 'football-outline' },
  { value: 'gym', label: 'Gym', icon: 'barbell-outline' },
  { value: 'running', label: 'Running', icon: 'walk-outline' },
  { value: 'snooker', label: 'Snooker', icon: 'bowling-ball-outline' },
  { value: 'swimming', label: 'Swimming', icon: 'water-outline' },
  { value: 'tennis', label: 'Tennis', icon: 'tennisball-outline' },
  { value: 'yoga', label: 'Yoga', icon: 'body-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export const CAMPUS_LOCATIONS: string[] = [
  'Basketball Court',
  'Gym',
  'Library',
  'Sports Field',
  'Student Center',
  'Swimming Pool',
  'Tennis Court',
  'Track',
  'Other',
];

export type ExpiryOption = 'after_event' | '24h' | '48h' | '1w';

export const EXPIRY_OPTIONS: { value: ExpiryOption; label: string }[] = [
  { value: 'after_event', label: 'After event' },
  { value: '24h', label: '24 hours' },
  { value: '48h', label: '48 hours' },
  { value: '1w', label: '1 week' },
];

function computeExpiresAt(option: ExpiryOption | null | undefined, activityAtIso: string | null): string | null {
  if (!option) return null;
  if (option === 'after_event') return activityAtIso;
  const hours = option === '24h' ? 24 : option === '48h' ? 48 : 24 * 7;
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

export type NewPost = {
  type: PostType;
  caption: string;
  achievement?: AchievementCandidate;
  partner?: {
    activityType: string;
    activityAt: string;
    location: string;
    peopleNeeded: number | null;
  };
  expiryOption?: ExpiryOption | null;
  challengeId?: string | null;
};

export async function createPost(userId: string, input: NewPost): Promise<void> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      type: input.type,
      caption: input.caption || null,
      achievement_kind: input.achievement?.kind ?? null,
      achievement_title: input.achievement?.title ?? null,
      achievement_icon: input.achievement?.icon ?? null,
      achievement_xp: input.achievement?.xp ?? null,
      activity_type: input.partner?.activityType ?? null,
      activity_at: input.partner?.activityAt ?? null,
      location: input.partner?.location ?? null,
      people_needed: input.partner?.peopleNeeded ?? null,
      expires_at: computeExpiresAt(input.expiryOption, input.partner?.activityAt ?? null),
      challenge_id: input.challengeId ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;

  // The post itself is already saved at this point — a notification failure must not
  // surface as "post failed", same reasoning as the comment-notification guard below.
  try {
    await notifyFriendsOfPost(userId, (data as { id: string }).id);
  } catch (err) {
    console.error('notifyFriendsOfPost failed', err);
  }
}

// RLS restricts this to the author's own rows, but userId is passed explicitly to match
// every other write in this file and avoid depending solely on the DB policy to catch a
// caller's mistake.
export async function deletePost(userId: string, postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', userId);
  if (error) throw error;
}

export type UpdatePostInput = {
  caption: string;
  partner?: {
    activityType: string;
    activityAt: string;
    location: string;
    peopleNeeded: number | null;
  };
  expiryOption?: ExpiryOption | null;
  challengeId?: string | null;
};

// Deliberately leaves the post's type and achievement_* columns untouched — which
// achievement was shared is tied to the moment it was posted and isn't re-pickable later,
// unlike a partner post's activity/date/location/expiry, which are safe to change after
// the fact.
export async function updatePost(userId: string, postId: string, input: UpdatePostInput): Promise<void> {
  const { data, error } = await supabase
    .from('posts')
    .update({
      caption: input.caption || null,
      activity_type: input.partner?.activityType ?? null,
      activity_at: input.partner?.activityAt ?? null,
      location: input.partner?.location ?? null,
      people_needed: input.partner?.peopleNeeded ?? null,
      expires_at: computeExpiresAt(input.expiryOption, input.partner?.activityAt ?? null),
      challenge_id: input.challengeId ?? null,
    })
    .eq('id', postId)
    .eq('user_id', userId)
    .select('id');
  if (error) throw error;
  // RLS can block the update while still reporting no error — Postgres just matches zero
  // rows. Without this check, an update denied by a missing/misconfigured policy looks
  // identical to a successful save.
  if (!data || data.length === 0) {
    throw new Error('Post could not be updated — it may no longer exist or you may not have permission to edit it.');
  }
}

export type FeedPost = {
  id: string;
  userId: string;
  name: string;
  type: PostType;
  caption: string | null;
  achievementTitle: string | null;
  achievementIcon: string | null;
  achievementXp: number | null;
  activityType: string | null;
  activityAt: string | null;
  location: string | null;
  peopleNeeded: number | null;
  expiresAt: string | null;
  linkedChallengeId: string | null;
  linkedChallengeTitle: string | null;
  linkedChallengeIcon: string | null;
  createdAt: string;
};

type PostRow = {
  id: string;
  user_id: string;
  type: PostType;
  caption: string | null;
  achievement_title: string | null;
  achievement_icon: string | null;
  achievement_xp: number | null;
  activity_type: string | null;
  activity_at: string | null;
  location: string | null;
  people_needed: number | null;
  expires_at: string | null;
  challenge_id: string | null;
  challenges: { title: string; icon: string } | { title: string; icon: string }[] | null;
  created_at: string;
};

const POST_SELECT =
  'id, user_id, type, caption, achievement_title, achievement_icon, achievement_xp, activity_type, activity_at, location, people_needed, expires_at, challenge_id, challenges(title, icon), created_at';

function mapPostRows(rows: PostRow[], profileById: Map<string, ProfileNameRow>): FeedPost[] {
  return rows.map((r) => {
    const challenge = Array.isArray(r.challenges) ? r.challenges[0] : r.challenges;
    return {
      id: r.id,
      userId: r.user_id,
      name: displayName(profileById.get(r.user_id)),
      type: r.type,
      caption: r.caption,
      achievementTitle: r.achievement_title,
      achievementIcon: r.achievement_icon,
      achievementXp: r.achievement_xp,
      activityType: r.activity_type,
      activityAt: r.activity_at,
      location: r.location,
      peopleNeeded: r.people_needed,
      expiresAt: r.expires_at,
      linkedChallengeId: r.challenge_id,
      linkedChallengeTitle: challenge?.title ?? null,
      linkedChallengeIcon: challenge?.icon ?? null,
      createdAt: r.created_at,
    };
  });
}

async function fetchProfilesById(userIds: string[]): Promise<Map<string, ProfileNameRow>> {
  const { data } = userIds.length
    ? await supabase.from('profiles').select('id, username, first_name, last_name').in('id', userIds)
    : { data: [] as ProfileNameRow[] };
  return new Map(((data ?? []) as ProfileNameRow[]).map((p) => [p.id, p]));
}

// Friends' (and your own) posts, newest first — created_at is a real DB timestamp set at
// post time, so relative-time display is always accurate regardless of timezone. Excludes
// posts whose expires_at has passed (Partner posts with auto-expiry on).
export async function fetchFriendPosts(userId: string, limit = 30): Promise<FeedPost[]> {
  const friendIds = await fetchAcceptedFriendIds(userId);
  const authorIds = [userId, ...friendIds];

  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .in('user_id', authorIds)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data ?? []) as PostRow[];
  const profileById = await fetchProfilesById([...new Set(rows.map((r) => r.user_id))]);
  return mapPostRows(rows, profileById);
}

// Loads one post regardless of the feed's usual friend/limit scoping — used when a
// notification deep-links straight to a specific post (RLS still applies: this returns
// nothing if the viewer isn't the author or an accepted friend of theirs).
export async function fetchPostById(postId: string): Promise<FeedPost | null> {
  const { data, error } = await supabase.from('posts').select(POST_SELECT).eq('id', postId).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as PostRow;
  const profileById = await fetchProfilesById([row.user_id]);
  return mapPostRows([row], profileById)[0];
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export type JoinState = { count: number; joined: boolean };
const EMPTY_JOIN: JoinState = { count: 0, joined: false };

export async function fetchJoins(postIds: string[], userId: string): Promise<Map<string, JoinState>> {
  const map = new Map<string, JoinState>();
  for (const id of postIds) map.set(id, { ...EMPTY_JOIN });
  if (postIds.length === 0) return map;

  const { data, error } = await supabase.from('post_joins').select('post_id, user_id').in('post_id', postIds);
  if (error) throw error;

  for (const row of (data ?? []) as { post_id: string; user_id: string }[]) {
    const entry = map.get(row.post_id);
    if (!entry) continue;
    entry.count += 1;
    if (row.user_id === userId) entry.joined = true;
  }
  return map;
}

// Joins a Partner post if there's still room — peopleNeeded null means unlimited ("Any").
// Re-checks the live count right before inserting to shrink (not eliminate) the race window
// where two people tap Join for the last open spot at the same moment.
export async function joinPost(userId: string, postId: string, peopleNeeded: number | null): Promise<void> {
  if (peopleNeeded != null) {
    const { count, error: countError } = await supabase
      .from('post_joins')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId);
    if (countError) throw countError;
    if ((count ?? 0) >= peopleNeeded) throw new Error('This post just filled up.');
  }

  const { error } = await supabase.from('post_joins').insert({ post_id: postId, user_id: userId });
  if (error) throw error;
}

export async function leavePost(userId: string, postId: string): Promise<void> {
  const { error } = await supabase.from('post_joins').delete().eq('post_id', postId).eq('user_id', userId);
  if (error) throw error;
}

export type ReactionKind = 'fire' | 'like';
export type ReactionCounts = { fire: number; like: number; userFire: boolean; userLike: boolean };
const EMPTY_REACTION: ReactionCounts = { fire: 0, like: 0, userFire: false, userLike: false };

export async function fetchReactions(postIds: string[], userId: string): Promise<Map<string, ReactionCounts>> {
  const map = new Map<string, ReactionCounts>();
  for (const id of postIds) map.set(id, { ...EMPTY_REACTION });
  if (postIds.length === 0) return map;

  const { data, error } = await supabase
    .from('post_reactions')
    .select('post_id, user_id, reaction')
    .in('post_id', postIds);
  if (error) throw error;

  for (const row of (data ?? []) as { post_id: string; user_id: string; reaction: ReactionKind }[]) {
    const entry = map.get(row.post_id);
    if (!entry) continue;
    if (row.reaction === 'fire') {
      entry.fire += 1;
      if (row.user_id === userId) entry.userFire = true;
    } else {
      entry.like += 1;
      if (row.user_id === userId) entry.userLike = true;
    }
  }
  return map;
}

export async function toggleReaction(
  userId: string,
  postId: string,
  reaction: ReactionKind,
  currentlyOn: boolean
): Promise<void> {
  if (currentlyOn) {
    const { error } = await supabase
      .from('post_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('reaction', reaction);

    if (error) throw error;

    return;
  }

  const { error } =
    await supabase
      .from('post_reactions')
      .insert({
        post_id: postId,
        user_id: userId,
        reaction,
      });

  if (error) throw error;

  /*
   * Find the post owner.
   */
  const { data: postData, error: postError } =
    await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

  if (postError) {
    console.error(
      'Could not find post owner for reaction notification',
      postError
    );

    return;
  }

  const postOwnerId =
    (postData as {
      user_id: string;
    }).user_id;

  /*
   * Don't notify yourself.
   *
   * Notification failure should not make
   * the successful reaction look like it failed.
   */
  try {
    await notifyReaction(
      postOwnerId,
      userId,
      postId,
      reaction
    );
  } catch (err) {
    console.error(
      'notifyReaction failed',
      err
    );
  }
}

export type Comment = {
  id: string;
  postId: string;
  userId: string;
  name: string;
  body: string;
  createdAt: string;
};

type CommentRow = { id: string; post_id: string; user_id: string; body: string; created_at: string };

// Lightweight per-post counts for the feed card's "💬 N" button — full comment bodies are
// only fetched when a thread is actually expanded, not preloaded for every post on scroll.
export async function fetchCommentCounts(postIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const id of postIds) map.set(id, 0);
  if (postIds.length === 0) return map;

  const { data, error } = await supabase.from('post_comments').select('post_id').in('post_id', postIds);
  if (error) throw error;

  for (const row of (data ?? []) as { post_id: string }[]) {
    map.set(row.post_id, (map.get(row.post_id) ?? 0) + 1);
  }
  return map;
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('id, post_id, user_id, body, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as CommentRow[];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profilesData } = userIds.length
    ? await supabase.from('profiles').select('id, username, first_name, last_name').in('id', userIds)
    : { data: [] as ProfileNameRow[] };
  const profileById = new Map(((profilesData ?? []) as ProfileNameRow[]).map((p) => [p.id, p]));

  return rows.map((r) => ({
    id: r.id,
    postId: r.post_id,
    userId: r.user_id,
    name: displayName(profileById.get(r.user_id)),
    body: r.body,
    createdAt: r.created_at,
  }));
}

// postAuthorId identifies who to notify — passed in rather than looked up here since the
// caller (the feed) already has it on the FeedPost it's commenting on.
export async function addComment(userId: string, postId: string, postAuthorId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;

  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: userId, body: trimmed })
    .select('id')
    .single();
  if (error) throw error;

  // The comment itself is already saved at this point — a notification failure (e.g. the
  // notifications table/policies not set up yet) must not surface as "comment failed".
  const commentId = (data as { id: string }).id;
  try {
    await notifyComment(postAuthorId, userId, postId, commentId);
  } catch (err) {
    console.error('notifyComment failed', err);
  }
}

export async function deleteComment(userId: string, commentId: string): Promise<void> {
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId).eq('user_id', userId);
  if (error) throw error;
}
