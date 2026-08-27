import { supabase } from './supabase';

export type AdminUser = {
  id: string;
  username: string;
  level: number;
  xp: number;
  streak: number;
  lastSeenAt: string | null;
  createdAt: string;
  suspended: boolean;
};

// A user counts as "Active" if they've pinged within the last 5 minutes — aura-app
// re-pings every 2 minutes while the app is open, so 5 minutes gives a buffer for one
// missed tick before someone flips to Offline.
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export function isUserActive(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ACTIVE_WINDOW_MS;
}

// Mirrors aura-app's src/lib/level.ts getLevelTitle() tiers, used here for the Level filter.
export function getLevelTitle(level: number): string {
  if (level < 5) return 'Beginner';
  if (level < 10) return 'Rookie';
  if (level < 20) return 'Warrior';
  if (level < 30) return 'Athlete';
  if (level < 40) return 'Elite';
  return 'Legend';
}

type ProfileRow = {
  id: string;
  username: string;
  level: number;
  xp: number;
  streak_days: number;
  last_seen_at: string | null;
  created_at: string;
  suspended: boolean;
};

function toAdminUser(row: ProfileRow): AdminUser {
  return {
    id: row.id,
    username: row.username,
    level: row.level ?? 1,
    xp: row.xp ?? 0,
    streak: row.streak_days ?? 0,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    suspended: row.suspended ?? false,
  };
}

export async function fetchAllUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, level, xp, streak_days, last_seen_at, created_at, suspended')
    .order('username', { ascending: true });
  if (error) throw error;

  return ((data ?? []) as ProfileRow[]).map(toAdminUser);
}

export async function setUserSuspended(userId: string, suspended: boolean): Promise<void> {
  const { data, error } = await supabase.from('profiles').update({ suspended }).eq('id', userId).select('id');
  if (error) throw error;
  // RLS blocks (rather than errors on) an update with no visible matching row, so an
  // empty result here means the write silently did nothing — surface that instead of
  // letting the caller believe it succeeded.
  if (!data || data.length === 0) {
    throw new Error('Suspend update did not apply — check the admin update policy on profiles.');
  }
}
