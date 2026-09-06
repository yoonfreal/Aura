import { supabase } from './supabase';
import { logAdminActivity } from './activityLog';

export type AdminUser = {
  id: string;
  username: string;
  level: number;
  xp: number;
  streak: number;
  lastSeenAt: string | null;
  createdAt: string;
  suspended: boolean;
  flagged: boolean;
  flagReason: string | null;
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

// Mirrors aura-app's src/lib/level.ts xpForLevel() — cumulative XP to reach
// level N = 80 × (N-1)^1.3. Anchored at (N-1) so level 1 starts at 0 XP.
export function xpForLevel(level: number): number {
  return Math.round(80 * Math.pow(level - 1, 1.3));
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
  flagged: boolean;
  flag_reason: string | null;
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
    flagged: row.flagged ?? false,
    flagReason: row.flag_reason,
  };
}

export async function fetchAllUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, level, xp, streak_days, last_seen_at, created_at, suspended, flagged, flag_reason')
    .order('username', { ascending: true });
  if (error) throw error;

  return ((data ?? []) as ProfileRow[]).map(toAdminUser);
}

// Powers the User Management page's "Suspicious activities" panel — only the currently
// flagged accounts, not the full user list.
export async function fetchFlaggedUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, level, xp, streak_days, last_seen_at, created_at, suspended, flagged, flag_reason')
    .eq('flagged', true)
    .order('username', { ascending: true });
  if (error) throw error;

  return ((data ?? []) as ProfileRow[]).map(toAdminUser);
}

// Looks up one profile regardless of current flagged/suspended state — needed by the Flag
// History page, since a past (already-cleared) entry's account won't show up in
// fetchFlaggedUsers anymore but should still be viewable.
export async function fetchUserById(userId: string): Promise<AdminUser | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, level, xp, streak_days, last_seen_at, created_at, suspended, flagged, flag_reason')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;

  return data ? toAdminUser(data as ProfileRow) : null;
}

export async function setUserSuspended(userId: string, suspended: boolean, adminId: string, adminUsername: string): Promise<void> {
  const { data, error } = await supabase.from('profiles').update({ suspended }).eq('id', userId).select('id, username');
  if (error) throw error;
  // RLS blocks (rather than errors on) an update with no visible matching row, so an
  // empty result here means the write silently did nothing — surface that instead of
  // letting the caller believe it succeeded.
  if (!data || data.length === 0) {
    throw new Error('Suspend update did not apply — check the admin update policy on profiles.');
  }

  try {
    const targetUsername = (data[0] as { username: string }).username;
    await logAdminActivity(adminId, adminUsername, suspended ? 'Suspended user' : 'Unsuspended user', targetUsername);
  } catch {
    // Best-effort — the suspend/unsuspend itself already succeeded.
  }
}

// Clears a flag once an admin has reviewed it and decided it was a false alarm (or has
// already dealt with the account another way). There's no manual "flag" counterpart —
// flags are only ever raised automatically by aura-app's unusual-activity checks.
export async function clearUserFlag(
  userId: string,
  adminId: string | null,
  clearedByUsername: string | null,
  note?: string | null,
  flagHistoryId?: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ flagged: false, flag_reason: null })
    .eq('id', userId)
    .select('id, username');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Flag clear did not apply — check the admin update policy on profiles.');
  }

  // Closes out exactly one open flag_history row: the specific one the admin resolved, if
  // known (the Flag History page's per-row Resolve button knows this), or otherwise the
  // single most recent open row for this user (User Management's Clear Flag only ever deals
  // with "the current flag", which is the most recent one). Deliberately never a blanket
  // "every open row for this user_id" — a user can accumulate more than one open flag (e.g.
  // flagged again the next day before the first was reviewed), and closing all of them
  // whenever just one gets resolved would silently disappear the others from "Pending".
  // Best-effort: never let a history-write hiccup undo the clear that already succeeded.
  try {
    let targetId = flagHistoryId;
    if (!targetId) {
      const { data: openRows } = await supabase
        .from('flag_history')
        .select('id')
        .eq('user_id', userId)
        .is('cleared_at', null)
        .order('flagged_at', { ascending: false })
        .limit(1);
      targetId = openRows?.[0]?.id;
    }
    if (targetId) {
      await supabase
        .from('flag_history')
        .update({ cleared_at: new Date().toISOString(), cleared_by_username: clearedByUsername, admin_note: note ?? null })
        .eq('id', targetId);
    }
  } catch {
    // Best-effort.
  }

  if (adminId && clearedByUsername) {
    try {
      const targetUsername = (data[0] as { username: string }).username;
      await logAdminActivity(adminId, clearedByUsername, 'Cleared flag', note ? `${targetUsername} — ${note}` : targetUsername);
    } catch {
      // Best-effort.
    }
  }
}

export type FlagHistoryEntry = {
  id: string;
  reason: string;
  flaggedAt: string;
  clearedAt: string | null;
  clearedByUsername: string | null;
  adminNote: string | null;
};

type FlagHistoryRow = {
  id: string;
  reason: string;
  flagged_at: string;
  cleared_at: string | null;
  cleared_by_username: string | null;
  admin_note: string | null;
};

// Powers the profile modal's "Flag History" section, so an admin reviewing one account can
// see whether it's been flagged (and cleared) before — the single flagged/flag_reason pair
// on profiles only ever holds the current state, not past cycles.
export async function fetchFlagHistory(userId: string): Promise<FlagHistoryEntry[]> {
  const { data, error } = await supabase
    .from('flag_history')
    .select('id, reason, flagged_at, cleared_at, cleared_by_username, admin_note')
    .eq('user_id', userId)
    .order('flagged_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as FlagHistoryRow[]).map((row) => ({
    id: row.id,
    reason: row.reason,
    flaggedAt: row.flagged_at,
    clearedAt: row.cleared_at,
    clearedByUsername: row.cleared_by_username,
    adminNote: row.admin_note,
  }));
}

export type AllFlagHistoryEntry = FlagHistoryEntry & { userId: string; username: string; suspended: boolean };

type AllFlagHistoryRow = FlagHistoryRow & {
  user_id: string;
  profiles: { username: string; suspended: boolean } | { username: string; suspended: boolean }[] | null;
};

// Powers the standalone Flag History page — every flag/clear cycle across every user,
// newest first, unlike fetchFlagHistory which is scoped to one account's profile modal.
export async function fetchAllFlagHistory(): Promise<AllFlagHistoryEntry[]> {
  const { data, error } = await supabase
    .from('flag_history')
    .select('id, user_id, reason, flagged_at, cleared_at, cleared_by_username, admin_note, profiles!inner(username, suspended)')
    .order('flagged_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as AllFlagHistoryRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      userId: row.user_id,
      username: profile?.username ?? 'Unknown',
      suspended: profile?.suspended ?? false,
      reason: row.reason,
      flaggedAt: row.flagged_at,
      clearedAt: row.cleared_at,
      clearedByUsername: row.cleared_by_username,
      adminNote: row.admin_note,
    };
  });
}
