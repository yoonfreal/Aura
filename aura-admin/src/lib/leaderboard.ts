import { supabase } from './supabase';
import { getLevelTitle } from './users';

export type LeaderboardPeriod = 'overall' | 'weekly' | 'monthly';

export type LeaderboardEntry = {
  id: string;
  username: string;
  level: number;
  levelTitle: string;
  challengesJoined: number;
  xp: number;
};

// The Monday of the current calendar week — same boundary aura-app's own Leaderboard
// "Weekly" tab uses (see getMondayDate in aura-app/src/app/(tabs)/rank.tsx) — so "Weekly"
// always means "this week so far," not a rolling last-7-days window.
function startOfWeekISO(): string {
  const d = new Date();
  const daysSinceMonday = (d.getDay() + 6) % 7; // getDay(): 0=Sun..6=Sat
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysSinceMonday).toISOString().split('T')[0];
}

// The 1st of the current calendar month — e.g. viewed anytime in August, this returns
// Aug 1, so "Monthly" always means "this calendar month so far," not a rolling 30 days.
function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

type ProfileRow = { id: string; username: string; level: number | null; xp: number | null };

// Weekly/Monthly sum daily_stats.xp_earned — a per-day ledger aura-app bumps both when a
// mission completes and when a challenge reward is claimed (see incrementDailyStat calls
// in aura-app/src/lib/api.ts and claimReward in aura-app/src/lib/challenges.ts), so it's
// the one place both XP sources are already combined per day. This requires daily_stats'
// SELECT policy to allow any authenticated user to read all rows (not just their own) —
// added directly in Supabase, since without it this silently returns 0 for every user but
// the querying session. Both periods are fixed calendar spans to date (Weekly: Mon–Sun,
// Monthly: 1st–end of month), not rolling windows, so everyone's ranking resets together.
export async function fetchLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  const [{ data: profileRows, error: profileError }, { data: participantRows, error: participantError }] =
    await Promise.all([
      supabase.from('profiles').select('id, username, level, xp'),
      supabase.from('challenge_participants').select('user_id').eq('status', 'accepted'),
    ]);
  if (profileError) throw profileError;
  if (participantError) throw participantError;

  const joinedCounts = new Map<string, number>();
  for (const row of (participantRows ?? []) as { user_id: string }[]) {
    joinedCounts.set(row.user_id, (joinedCounts.get(row.user_id) ?? 0) + 1);
  }

  let periodXp: Map<string, number> | null = null;
  if (period !== 'overall') {
    const since = period === 'weekly' ? startOfWeekISO() : startOfMonthISO();
    const { data, error } = await supabase.from('daily_stats').select('user_id, xp_earned').gte('date', since);
    if (error) throw error;

    periodXp = new Map();
    for (const row of (data ?? []) as { user_id: string; xp_earned: number | null }[]) {
      periodXp.set(row.user_id, (periodXp.get(row.user_id) ?? 0) + (row.xp_earned ?? 0));
    }
  }

  const entries: LeaderboardEntry[] = ((profileRows ?? []) as ProfileRow[]).map((row) => {
    const level = row.level ?? 1;
    return {
      id: row.id,
      username: row.username,
      level,
      levelTitle: getLevelTitle(level),
      challengesJoined: joinedCounts.get(row.id) ?? 0,
      xp: period === 'overall' ? (row.xp ?? 0) : (periodXp?.get(row.id) ?? 0),
    };
  });

  entries.sort((a, b) => b.xp - a.xp);
  return entries;
}
