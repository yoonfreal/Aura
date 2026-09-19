import { supabase } from '@/lib/supabase';
import { isStreakStillAlive } from '@/lib/thailandTime';

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

export type StreakEntry = { userId: string; name: string; streakDays: number };

// Friends currently on an active streak, hottest first — pure read off profiles.streak_days,
// no separate streak-tracking table needed. streak_days only updates when a friend
// completes a mission, so a friend who's gone quiet still has their old streak_days sitting
// there stale — isStreakStillAlive filters those out rather than showing a dead streak as live.
export async function fetchFriendStreaks(userId: string): Promise<StreakEntry[]> {
  const friendIds = await fetchAcceptedFriendIds(userId);
  if (friendIds.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, streak_days, last_active_date')
    .in('id', friendIds)
    .gt('streak_days', 0)
    .order('streak_days', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as (ProfileNameRow & { streak_days: number | null; last_active_date: string | null })[])
    .filter((p) => isStreakStillAlive(p.last_active_date))
    .map((p) => ({
      userId: p.id,
      name: displayName(p),
      streakDays: p.streak_days ?? 0,
    }));
}
