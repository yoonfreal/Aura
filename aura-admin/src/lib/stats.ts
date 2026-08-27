import { supabase } from './supabase';

export type DailyActiveCount = {
  date: string;
  label: string;
  count: number;
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export async function fetchTotalUsers(): Promise<number> {
  const { count, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

// Last 7 calendar days ending today. Counts distinct users with a daily_stats row on
// each date — that row now gets created the moment the app opens (see aura-app's
// ensureActiveToday), not just when a mission/challenge is completed, so this reflects
// who actually used the app that day, not just who "did something."
export async function fetchDailyActiveCounts(): Promise<DailyActiveCount[]> {
  const start = isoDateDaysAgo(6);

  const { data, error } = await supabase
    .from('daily_stats')
    .select('user_id, date')
    .gte('date', start);
  if (error) throw error;

  const usersByDate = new Map<string, Set<string>>();
  for (const row of (data ?? []) as { user_id: string; date: string }[]) {
    if (!usersByDate.has(row.date)) usersByDate.set(row.date, new Set());
    usersByDate.get(row.date)!.add(row.user_id);
  }

  return Array.from({ length: 7 }, (_, i) => {
    const date = isoDateDaysAgo(6 - i);
    const label = WEEKDAY_LABELS[new Date(`${date}T00:00:00`).getDay()];
    return { date, label, count: usersByDate.get(date)?.size ?? 0 };
  });
}
