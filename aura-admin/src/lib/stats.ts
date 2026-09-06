import { supabase } from './supabase';
import { addDaysToISO, daysBetweenISO, thailandDateISO, thailandMonthRange, thailandWeekdayIndex } from './thailandTime';

export type DailyActiveCount = {
  date: string;
  label: string;
  count: number;
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isoDateOffset(days: number): string {
  return addDaysToISO(thailandDateISO(), days);
}

export async function fetchTotalUsers(): Promise<number> {
  const { count, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function fetchFlaggedCount(): Promise<number> {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('flagged', true);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchGymCheckInsToday(): Promise<number> {
  const today = thailandDateISO();
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
  const today = thailandDateISO();
  const daysSinceSunday = (thailandWeekdayIndex(today) + 1) % 7; // Mon-anchored index -> Sun-anchored offset
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
    const label = WEEKDAY_LABELS[(thailandWeekdayIndex(date) + 1) % 7];
    return { date, label, count: usersByDate.get(date)?.size ?? 0 };
  });
}

// A stat plus its month-over-month trend. changePercent is null when the prior month has no
// baseline to compare against (division by zero), rather than a misleading 0%.
export type TrendStat = { value: number; changePercent: number | null };

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
}

// This-month-to-date vs. the equivalent range last month — e.g. viewed on the 12th, compares
// the 1st-12th of this month against the 1st-12th of last month, not the full prior month,
// so a partial current month isn't compared against a complete one.
function currentAndComparableRanges(): { current: { start: string; end: string }; previous: { start: string; end: string } } {
  const today = thailandDateISO();
  const thisMonth = thailandMonthRange(0);
  const lastMonth = thailandMonthRange(-1);
  const elapsedDays = daysBetweenISO(thisMonth.start, today);
  const previousEnd = addDaysToISO(lastMonth.start, Math.min(elapsedDays, daysBetweenISO(lastMonth.start, lastMonth.end)));
  return {
    current: { start: thisMonth.start, end: today },
    previous: { start: lastMonth.start, end: previousEnd },
  };
}

// Avg steps per daily_stats row (i.e. per active user-day) this month to date vs. the same
// span last month.
export async function fetchAvgDailySteps(): Promise<TrendStat> {
  const { current, previous } = currentAndComparableRanges();
  const [{ data: cur, error: e1 }, { data: prev, error: e2 }] = await Promise.all([
    supabase.from('daily_stats').select('steps').gte('date', current.start).lte('date', current.end),
    supabase.from('daily_stats').select('steps').gte('date', previous.start).lte('date', previous.end),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const curAvg = average(((cur ?? []) as { steps: number | null }[]).map((r) => r.steps ?? 0));
  const prevAvg = average(((prev ?? []) as { steps: number | null }[]).map((r) => r.steps ?? 0));
  return { value: Math.round(curAvg), changePercent: percentChange(curAvg, prevAvg) };
}

// Avg calories per daily_stats row this month to date vs. the same span last month.
export async function fetchAvgDailyCalories(): Promise<TrendStat> {
  const { current, previous } = currentAndComparableRanges();
  const [{ data: cur, error: e1 }, { data: prev, error: e2 }] = await Promise.all([
    supabase.from('daily_stats').select('calories').gte('date', current.start).lte('date', current.end),
    supabase.from('daily_stats').select('calories').gte('date', previous.start).lte('date', previous.end),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const curAvg = average(((cur ?? []) as { calories: number | null }[]).map((r) => r.calories ?? 0));
  const prevAvg = average(((prev ?? []) as { calories: number | null }[]).map((r) => r.calories ?? 0));
  return { value: Math.round(curAvg), changePercent: percentChange(curAvg, prevAvg) };
}

// Gym check-ins per week, i.e. total check-ins over the span divided by how many weeks the
// span covers — this month to date vs. the same span last month.
export async function fetchGymCheckInsPerWeek(): Promise<TrendStat> {
  const { current, previous } = currentAndComparableRanges();
  const [{ count: curCount, error: e1 }, { count: prevCount, error: e2 }] = await Promise.all([
    supabase.from('gym_checkins').select('id', { count: 'exact', head: true }).gte('date', current.start).lte('date', current.end),
    supabase.from('gym_checkins').select('id', { count: 'exact', head: true }).gte('date', previous.start).lte('date', previous.end),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const curWeeks = (daysBetweenISO(current.start, current.end) + 1) / 7;
  const prevWeeks = (daysBetweenISO(previous.start, previous.end) + 1) / 7;
  const curRate = (curCount ?? 0) / curWeeks;
  const prevRate = (prevCount ?? 0) / prevWeeks;
  return { value: Math.round(curRate), changePercent: percentChange(curRate, prevRate) };
}

// Share of accepted challenge_participants rows (joined in the span) marked completed — this
// month to date vs. the same span last month. Deliberately different from the Challenges
// page's per-type, all-time completion rate (see completionRateFor in
// app/(admin)/challenges/page.tsx): this is a fresh, blended-across-types trend signal, not
// a replacement for that page's historical number, and the two are not expected to match.
export async function fetchChallengeCompletionRate(): Promise<TrendStat> {
  const { current, previous } = currentAndComparableRanges();
  const [{ data: cur, error: e1 }, { data: prev, error: e2 }] = await Promise.all([
    supabase
      .from('challenge_participants')
      .select('completed')
      .eq('status', 'accepted')
      .gte('joined_at', `${current.start}T00:00:00`)
      .lte('joined_at', `${current.end}T23:59:59`),
    supabase
      .from('challenge_participants')
      .select('completed')
      .eq('status', 'accepted')
      .gte('joined_at', `${previous.start}T00:00:00`)
      .lte('joined_at', `${previous.end}T23:59:59`),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const rate = (rows: { completed: boolean }[]) =>
    rows.length === 0 ? 0 : Math.round((rows.filter((r) => r.completed).length / rows.length) * 100);
  const curRate = rate((cur ?? []) as { completed: boolean }[]);
  const prevRate = rate((prev ?? []) as { completed: boolean }[]);
  return { value: curRate, changePercent: percentChange(curRate, prevRate) };
}

export type MonthlyRegistration = { month: string; label: string; count: number };

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Calendar-month signup counts, oldest to newest, ending with the current (partial) month —
// e.g. Nov through May, not a rolling 210-day window.
export async function fetchMonthlyRegistrations(months = 7): Promise<MonthlyRegistration[]> {
  const earliest = thailandMonthRange(-(months - 1));
  const { data, error } = await supabase.from('profiles').select('created_at').gte('created_at', `${earliest.start}T00:00:00`);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { created_at: string }[]) {
    const monthKey = row.created_at.slice(0, 7); // YYYY-MM
    counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
  }

  return Array.from({ length: months }, (_, i) => {
    const { start } = thailandMonthRange(-(months - 1) + i);
    const monthKey = start.slice(0, 7);
    const label = MONTH_LABELS[Number(start.slice(5, 7)) - 1];
    return { month: monthKey, label, count: counts.get(monthKey) ?? 0 };
  });
}

export type FeatureEngagement = { label: string; percent: number };

// Share of all users who touched each feature at least once in the last 30 days. There's no
// generic event-tracking table in this app, so each feature is measured against the table
// that already records someone using it: a completed daily mission, an accepted challenge
// joined in the window, a gym QR check-in, or a new post. Leaderboard has no such table (it's
// a read-only view) — earning any XP is the closest proxy for "shows up on the leaderboard",
// so that one instead checks profiles.xp > 0 with no time window.
export async function fetchFeatureEngagement(): Promise<FeatureEngagement[]> {
  const since = addDaysToISO(thailandDateISO(), -30);
  const sinceTimestamp = `${since}T00:00:00`;
  const totalUsers = await fetchTotalUsers();

  // Promise.allSettled, not Promise.all: each feature's query hits its own table, and one
  // table being missing or mid-migration (e.g. gym_checkins isn't deployed yet as of writing)
  // shouldn't take down every other feature's number along with it.
  const [missions, challenges, checkins, posts, leaderboard] = await Promise.allSettled([
    supabase.from('user_missions').select('user_id').eq('completed', true).gte('date', since),
    supabase.from('challenge_participants').select('user_id').eq('status', 'accepted').gte('joined_at', sinceTimestamp),
    supabase.from('gym_checkins').select('user_id').gte('date', since),
    supabase.from('posts').select('user_id').gte('created_at', sinceTimestamp),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gt('xp', 0),
  ]);

  const distinctUsers = (rows: { user_id: string }[]) => new Set(rows.map((r) => r.user_id)).size;
  const percentOf = (count: number) => (totalUsers === 0 ? 0 : Math.round((count / totalUsers) * 100));

  // null (not 0%) when the query rejected or the table returned an error — a missing table
  // means "we don't know", not "nobody used this feature".
  const percentFromRows = (result: PromiseSettledResult<{ data: unknown; error: unknown }>): number | null => {
    if (result.status !== 'fulfilled' || result.value.error) return null;
    return percentOf(distinctUsers((result.value.data ?? []) as { user_id: string }[]));
  };
  const percentFromCount = (result: PromiseSettledResult<{ count: number | null; error: unknown }>): number | null => {
    if (result.status !== 'fulfilled' || result.value.error) return null;
    return percentOf(result.value.count ?? 0);
  };

  const candidates: { label: string; percent: number | null }[] = [
    { label: 'Daily missions', percent: percentFromRows(missions) },
    { label: 'Challenges', percent: percentFromRows(challenges) },
    { label: 'QR check-in', percent: percentFromRows(checkins) },
    { label: 'Social posts', percent: percentFromRows(posts) },
    { label: 'Leaderboard', percent: percentFromCount(leaderboard) },
  ];

  return candidates
    .filter((c): c is FeatureEngagement => c.percent !== null)
    .sort((a, b) => b.percent - a.percent);
}
