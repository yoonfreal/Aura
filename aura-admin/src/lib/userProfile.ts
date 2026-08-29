import { supabase } from './supabase';
import { addDaysToISO, thailandWeekRange } from './thailandTime';

// Extra profile data shown in the admin's user detail view — mirrors the sections aura-app
// shows on a friend's profile screen (aura-app's src/app/friend/[id].tsx), so admins see the
// same picture of a user that another user would see.

export type FriendSummary = { id: string; username: string; level: number };

type FriendshipRow = { requester_id: string; addressee_id: string };
type FriendProfileRow = { id: string; username: string; level: number | null };

export async function fetchUserFriends(userId: string): Promise<FriendSummary[]> {
  const { data: friendships, error: friendshipsError } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (friendshipsError) throw friendshipsError;

  const friendIds = ((friendships ?? []) as FriendshipRow[]).map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id,
  );
  if (friendIds.length === 0) return [];

  const { data, error } = await supabase.from('profiles').select('id, username, level').in('id', friendIds);
  if (error) throw error;

  return ((data ?? []) as FriendProfileRow[]).map((p) => ({ id: p.id, username: p.username, level: p.level ?? 1 }));
}

export type EarnedBadge = { label: string; icon: string; earned: boolean };

type BadgeDefRow = { badge_name: string | null; badge_icon: string | null };
type ParticipantBadgeRow = { challenges: { badge_name: string | null } | { badge_name: string | null }[] | null };

// Mirrors aura-app's src/lib/challenges.ts fetchBadges() — a badge counts as earned once
// claimed via a challenge win (challenge_participants.claimed) or recorded in a 1v1's
// archived history (challenge_history), matching how the mobile app determines "earned."
export async function fetchUserBadges(userId: string): Promise<EarnedBadge[]> {
  const { data: defsData, error: defsError } = await supabase
    .from('challenges')
    .select('badge_name, badge_icon')
    .not('badge_name', 'is', null);
  if (defsError) throw defsError;

  const iconByName = new Map<string, string>();
  for (const row of (defsData ?? []) as BadgeDefRow[]) {
    if (row.badge_name && !iconByName.has(row.badge_name)) {
      iconByName.set(row.badge_name, row.badge_icon ?? '🏅');
    }
  }

  const [{ data: participantData, error: participantError }, { data: historyData, error: historyError }] = await Promise.all([
    supabase.from('challenge_participants').select('challenges!inner(badge_name)').eq('user_id', userId).eq('claimed', true),
    supabase.from('challenge_history').select('badge_name').eq('user_id', userId).not('badge_name', 'is', null),
  ]);
  if (participantError) throw participantError;
  if (historyError) throw historyError;

  const earnedNames = new Set<string>();
  for (const row of (participantData ?? []) as ParticipantBadgeRow[]) {
    const challenge = Array.isArray(row.challenges) ? row.challenges[0] : row.challenges;
    if (challenge?.badge_name) earnedNames.add(challenge.badge_name);
  }
  for (const row of (historyData ?? []) as BadgeDefRow[]) {
    if (row.badge_name) earnedNames.add(row.badge_name);
  }

  return [...iconByName.entries()].map(([label, icon]) => ({ label, icon, earned: earnedNames.has(label) }));
}

export type UserPost = {
  id: string;
  type: 'achievement' | 'thoughts' | 'partner';
  caption: string | null;
  achievementTitle: string | null;
  achievementIcon: string | null;
  achievementXp: number | null;
  activityType: string | null;
  activityAt: string | null;
  location: string | null;
  peopleNeeded: number | null;
  challengeTitle: string | null;
  challengeIcon: string | null;
  createdAt: string;
};

type PostRow = {
  id: string;
  type: UserPost['type'];
  caption: string | null;
  achievement_title: string | null;
  achievement_icon: string | null;
  achievement_xp: number | null;
  activity_type: string | null;
  activity_at: string | null;
  location: string | null;
  people_needed: number | null;
  challenges: { title: string; icon: string } | { title: string; icon: string }[] | null;
  created_at: string;
};

// This user's own posts only (not a friend feed) — what an admin needs is the same complete
// picture a friend would see on aura-app's friend profile screen (see PostCard.tsx), not a
// condensed one-liner, so every field that screen renders is fetched here too.
export async function fetchUserPosts(userId: string, limit = 10): Promise<UserPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, type, caption, achievement_title, achievement_icon, achievement_xp, activity_type, activity_at, location, people_needed, challenges(title, icon), created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  return ((data ?? []) as PostRow[]).map((r) => {
    const challenge = Array.isArray(r.challenges) ? r.challenges[0] : r.challenges;
    return {
      id: r.id,
      type: r.type,
      caption: r.caption,
      achievementTitle: r.achievement_title,
      achievementIcon: r.achievement_icon,
      achievementXp: r.achievement_xp,
      activityType: r.activity_type,
      activityAt: r.activity_at,
      location: r.location,
      peopleNeeded: r.people_needed,
      challengeTitle: challenge?.title ?? null,
      challengeIcon: challenge?.icon ?? null,
      createdAt: r.created_at,
    };
  });
}

export type DailyProgressPoint = { date: string; label: string; steps: number; calories: number; xpEarned: number };

type DailyStatRow = { date: string; steps: number; calories: number; xp_earned: number };

const WEEK_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Same fixed Monday–Sunday calendar week (in Thailand time) as aura-app's own
// fetchWeeklyStats (aura-app/src/lib/api.ts's thailandWeekRange) — so an admin reviewing a
// flagged account sees the exact same week boundaries the user's own app shows them, not a
// different rolling window and not a UTC-shifted one.
function getCurrentWeekDates(): string[] {
  const { start } = thailandWeekRange();
  return Array.from({ length: 7 }, (_, i) => addDaysToISO(start, i));
}

export async function fetchUserWeeklyProgress(userId: string): Promise<DailyProgressPoint[]> {
  const days = getCurrentWeekDates();

  const { data, error } = await supabase
    .from('daily_stats')
    .select('date, steps, calories, xp_earned')
    .eq('user_id', userId)
    .gte('date', days[0])
    .lte('date', days[days.length - 1]);
  if (error) throw error;

  const byDate = new Map(((data ?? []) as DailyStatRow[]).map((row) => [row.date, row]));

  return days.map((date, i) => {
    const row = byDate.get(date);
    return {
      date,
      label: WEEK_DAY_LABELS[i],
      steps: row?.steps ?? 0,
      calories: row?.calories ?? 0,
      xpEarned: row?.xp_earned ?? 0,
    };
  });
}
