import { supabase } from '@/lib/supabase';

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

export type AchievementKind = 'mission' | 'badge' | 'challenge_win';

export type AchievementCandidate = {
  kind: AchievementKind;
  title: string;
  icon: string;
  xp: number;
  // Sort key only — never shown to the user, since mission completions only carry a date
  // (no time), so this is a same-day anchor, not a real moment.
  sortKey: string;
};

type RecentMissionRow = {
  date: string;
  missions: { title: string; xp_reward: number; icon: string } | { title: string; xp_reward: number; icon: string }[] | null;
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
// from the last `days` days, newest first.
export async function fetchRecentAchievements(userId: string, days = 3): Promise<AchievementCandidate[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  const [missionsRes, historyRes] = await Promise.all([
    supabase
      .from('user_missions')
      .select('date, missions(title, xp_reward, icon)')
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
  ]);

  const missionItems: AchievementCandidate[] = ((missionsRes.data ?? []) as RecentMissionRow[])
    .map((r) => ({ ...r, missions: Array.isArray(r.missions) ? r.missions[0] : r.missions }))
    .filter((r): r is RecentMissionRow & { missions: { title: string; xp_reward: number; icon: string } } => !!r.missions)
    .map((r) => ({
      kind: 'mission' as const,
      title: `Completed ${r.missions.title}`,
      icon: r.missions.icon || '🏅',
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

  return [...missionItems, ...historyItems].sort(
    (a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime(),
  );
}

export type PostType = 'achievement' | 'thoughts' | 'partner';

export const ACTIVITY_TYPES: { value: string; label: string; icon: string }[] = [
  { value: 'running', label: 'Running', icon: '🏃' },
  { value: 'gym', label: 'Gym', icon: '🏋️' },
  { value: 'basketball', label: 'Basketball', icon: '🏀' },
  { value: 'badminton', label: 'Badminton', icon: '🏸' },
  { value: 'swimming', label: 'Swimming', icon: '🏊' },
  { value: 'yoga', label: 'Yoga', icon: '🧘' },
  { value: 'cycling', label: 'Cycling', icon: '🚴' },
  { value: 'other', label: 'Other', icon: '⚡' },
];

export const CAMPUS_LOCATIONS: string[] = [
  'Gym',
  'Sports Field',
  'Swimming Pool',
  'Basketball Court',
  'Tennis Court',
  'Track',
  'Student Center',
  'Library',
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
    peopleNeeded: number;
  };
  expiryOption?: ExpiryOption | null;
  challengeId?: string | null;
};

export async function createPost(userId: string, input: NewPost): Promise<void> {
  const { error } = await supabase.from('posts').insert({
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
  });
  if (error) throw error;
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
  challenge_id: string | null;
  challenges: { title: string; icon: string } | { title: string; icon: string }[] | null;
  created_at: string;
};

// Friends' (and your own) posts, newest first — created_at is a real DB timestamp set at
// post time, so relative-time display is always accurate regardless of timezone. Excludes
// posts whose expires_at has passed (Partner posts with auto-expiry on).
export async function fetchFriendPosts(userId: string, limit = 30): Promise<FeedPost[]> {
  const friendIds = await fetchAcceptedFriendIds(userId);
  const authorIds = [userId, ...friendIds];

  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, user_id, type, caption, achievement_title, achievement_icon, achievement_xp, activity_type, activity_at, location, people_needed, challenge_id, challenges(title, icon), created_at',
    )
    .in('user_id', authorIds)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data ?? []) as PostRow[];
  const involvedIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profilesData } = involvedIds.length
    ? await supabase.from('profiles').select('id, username, first_name, last_name').in('id', involvedIds)
    : { data: [] as ProfileNameRow[] };
  const profileById = new Map(((profilesData ?? []) as ProfileNameRow[]).map((p) => [p.id, p]));

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
      linkedChallengeId: r.challenge_id,
      linkedChallengeTitle: challenge?.title ?? null,
      linkedChallengeIcon: challenge?.icon ?? null,
      createdAt: r.created_at,
    };
  });
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
  currentlyOn: boolean,
): Promise<void> {
  if (currentlyOn) {
    const { error } = await supabase
      .from('post_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('reaction', reaction);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('post_reactions').insert({ post_id: postId, user_id: userId, reaction });
    if (error) throw error;
  }
}
