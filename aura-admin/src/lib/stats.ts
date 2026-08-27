import { supabase } from './supabase';

export type DailyActiveCount = {
  date: string;
  label: string;
  count: number;
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export async function fetchTotalUsers(): Promise<number> {
  const { count, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function fetchGymCheckInsToday(): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const { count, error } = await supabase
    .from('gym_checkins')
    .select('id', { count: 'exact', head: true })
    .eq('date', today);
  if (error) throw error;
  return count ?? 0;
}

export type BreakdownBar = { label: string; percent: number };

// Age and gender are collected during aura-app's onboarding and saved straight to
// profiles.age / profiles.gender — anyone who signed up before onboarding existed just
// has both as null, so percentages are computed only over profiles that have a value.
export async function fetchUserDemographics(): Promise<{ gender: BreakdownBar[]; age: BreakdownBar[] }> {
  const { data, error } = await supabase.from('profiles').select('age, gender');
  if (error) throw error;

  const rows = (data ?? []) as { age: number | null; gender: string | null }[];

  const genderCounts = { Male: 0, Female: 0, Others: 0 };
  let genderTotal = 0;
  for (const row of rows) {
    if (!row.gender) continue;
    genderTotal += 1;
    if (row.gender === 'male') genderCounts.Male += 1;
    else if (row.gender === 'female') genderCounts.Female += 1;
    else genderCounts.Others += 1;
  }

  const ageBuckets = { '15-20': 0, '20-25': 0, '25-30': 0, '30+': 0 };
  let ageTotal = 0;
  for (const row of rows) {
    if (row.age == null) continue;
    ageTotal += 1;
    if (row.age < 20) ageBuckets['15-20'] += 1;
    else if (row.age < 25) ageBuckets['20-25'] += 1;
    else if (row.age < 30) ageBuckets['25-30'] += 1;
    else ageBuckets['30+'] += 1;
  }

  const toBars = (counts: Record<string, number>, total: number): BreakdownBar[] =>
    total === 0
      ? []
      : Object.entries(counts)
          .filter(([, count]) => count > 0)
          .map(([label, count]) => ({ label, percent: Math.round((count / total) * 100) }));

  return {
    gender: toBars(genderCounts, genderTotal),
    age: toBars(ageBuckets, ageTotal),
  };
}

// Fixed calendar week, Sunday through Saturday, covering today — not a rolling 7 days
// ending today. Counts distinct users with a daily_stats row on each date — that row now
// gets created the moment the app opens (see aura-app's ensureActiveToday), not just when
// a mission/challenge is completed, so this reflects who actually used the app that day,
// not just who "did something."
export async function fetchDailyActiveCounts(): Promise<DailyActiveCount[]> {
  const daysSinceSunday = new Date().getDay();
  const weekStart = isoDateOffset(-daysSinceSunday);
  const weekEnd = isoDateOffset(6 - daysSinceSunday);

  const { data, error } = await supabase
    .from('daily_stats')
    .select('user_id, date')
    .gte('date', weekStart)
    .lte('date', weekEnd);
  if (error) throw error;

  const usersByDate = new Map<string, Set<string>>();
  for (const row of (data ?? []) as { user_id: string; date: string }[]) {
    if (!usersByDate.has(row.date)) usersByDate.set(row.date, new Set());
    usersByDate.get(row.date)!.add(row.user_id);
  }

  return Array.from({ length: 7 }, (_, i) => {
    const date = isoDateOffset(i - daysSinceSunday);
    const label = WEEKDAY_LABELS[new Date(`${date}T00:00:00`).getDay()];
    return { date, label, count: usersByDate.get(date)?.size ?? 0 };
  });
}
