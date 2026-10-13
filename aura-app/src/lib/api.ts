import { supabase } from '@/lib/supabase';
import { xpForLevel } from '@/lib/level';
import { notifyStreakReminder } from '@/lib/notifications';
import { addDaysToISO, thailandDateISO, thailandHour, thailandRollingWeekRange, thailandWeekdayIndex } from '@/lib/thailandTime';
import { fetchDailyHealthTotals } from '@/lib/healthkit';
import type { Mission, DailyStats, WeeklyStats, WeeklyBarDay } from '@/types';

function todayISO(): string {
  return thailandDateISO();
}
// from daily_stats table
type DailyStatRow = { steps: number; calories: number; xp_earned: number } | null;


let missionsInFlight: { key: string; promise: Promise<Mission[]> } | null = null;

export function fetchTodayMissions(userId: string): Promise<Mission[]> {
  const today = todayISO();
  const key = `${userId}:${today}`;
  if (missionsInFlight?.key === key) return missionsInFlight.promise;

  const promise = requestTodayMissions(today).finally(() => {
    if (missionsInFlight?.promise === promise) missionsInFlight = null;
  });
  missionsInFlight = { key, promise };
  return promise;
}

async function requestTodayMissions(today: string): Promise<Mission[]> {
  const { data, error } = await supabase.functions.invoke<{ missions: Mission[] }>(
    'generate-daily-missions',
    { body: { date: today } },
  );
  if (error || !data?.missions) {
    console.error('fetchTodayMissions failed', error);
    return [];
  }

  return data.missions;
}

export async function ensureActiveToday(userId: string): Promise<void> {
  try {
    const today = todayISO();
    const { data } = await supabase
      .from('daily_stats')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (!data) {
      await supabase.from('daily_stats').insert({ user_id: userId, date: today, steps: 0, calories: 0, xp_earned: 0 });
    }
  } catch {
    //The catch is empty on purpose. This function only records that the student was active today for the admin's chart, which isn't important enough to block the app. If it fails, the app just carries on normally.
  }
}


export async function updateLastSeen(userId: string): Promise<void> {
  try {
    await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId);
  } catch {
    
  }
}


export async function checkStreakReminder(userId: string): Promise<void> {
  try {
    if (thailandHour() < 18) return;

    const { data } = await supabase
      .from('profiles')
      .select('last_active_date')
      .eq('id', userId)
      .single();

    const lastActiveDate = (data as { last_active_date: string | null } | null)?.last_active_date;
    if (lastActiveDate === todayISO()) return;

    await notifyStreakReminder(userId);
  } catch {
    
  }
}

export async function fetchDailyStats(
  userId: string,
): Promise<Pick<DailyStats, 'steps' | 'calories' | 'xpEarned'>> {
  const today = todayISO();

  const { data, error } = await supabase
    .from('daily_stats')
    .select('steps, calories, xp_earned')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
  if (error) throw error;

  const row = data as DailyStatRow;

  return {
    steps: row?.steps ?? 0,
    calories: row?.calories ?? 0,
    xpEarned: row?.xp_earned ?? 0,
  };
}


export async function incrementDailyXp(userId: string, amount: number): Promise<void> {
  const today = todayISO();

  const { data: existing, error: selectError } = await supabase
    .from('daily_stats')
    .select('id, xp_earned')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
  if (selectError) throw selectError;

  const row = existing as { id: string; xp_earned: number } | null;
  const xp_earned = (row?.xp_earned ?? 0) + amount;

  const { error: writeError } = row
    ? await supabase.from('daily_stats').update({ xp_earned }).eq('id', row.id)
    : await supabase.from('daily_stats').insert({ user_id: userId, date: today, steps: 0, calories: 0, xp_earned });
  if (writeError) throw writeError;
}

export async function syncHealthKitStats(
  userId: string,
  steps: number,
  calories: number,
  distanceKm = 0,
): Promise<void> {
  const today = todayISO();

  const { data: existing, error: selectError } = await supabase
    .from('daily_stats')
    .select('id')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
  if (selectError) throw selectError;

  const row = existing as { id: string } | null;

  const { error: writeError } = row
    ? await supabase.from('daily_stats').update({ steps, calories, distance_km: distanceKm }).eq('id', row.id)
    : await supabase.from('daily_stats').insert({ user_id: userId, date: today, steps, calories, distance_km: distanceKm, xp_earned: 0 });
  if (writeError) throw writeError;
}

type StatRow = { date: string; steps: number; calories: number; xp_earned: number };
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

//Get two weeks of data from both the database and Apple Health
export async function fetchWeeklyStats(userId: string): Promise<WeeklyStats> {
  const thisWeek = thailandRollingWeekRange(0);
  const lastWeek = thailandRollingWeekRange(-1);
  //offsetWeeks * 7
  const [{ data: statsRaw, error }, health] = await Promise.all([
    supabase.from('daily_stats').select('date, steps, calories, xp_earned').eq('user_id', userId).gte('date', lastWeek.start).lte('date', thisWeek.end),
    fetchDailyHealthTotals(lastWeek.start).catch((err) => {
      console.error('fetchDailyHealthTotals failed', err);
      return null;
    }),
  ]);
  if (error) throw error;

  //turns the database rows into a lookup by date
  const statsByDate = new Map(((statsRaw ?? []) as StatRow[]).map((r) => [r.date, r]));
  const dayRow = (date: string): StatRow => {
    const stat = statsByDate.get(date);
    const hk = health?.get(date);
    return {
      date,
      steps: health ? (hk?.steps ?? 0) : (stat?.steps ?? 0),
      calories: health ? (hk?.calories ?? 0) : (stat?.calories ?? 0),
      xp_earned: stat?.xp_earned ?? 0,
    };
  };
  const rowsFor = (range: { start: string }) => Array.from({ length: 7 }, (_, i) => dayRow(addDaysToISO(range.start, i)));
  const thisRows = rowsFor(thisWeek);
  const lastRows = rowsFor(lastWeek);

  const barData: WeeklyBarDay[] = thisRows.map((r) => ({
    day: WEEK_DAYS[thailandWeekdayIndex(r.date)],
    date: r.date,
    xp: r.xp_earned,
    steps: Math.round(r.steps),
    calories: Math.round(r.calories),
  }));

  // This week aggregates
  const totalSteps = Math.round(thisRows.reduce((s, r) => s + r.steps, 0));
  // Cut off, not rounded — same as Apple Health's daily average (see avgCalories).
  const avgSteps = Math.floor(totalSteps / 7 + 1e-9);
  const rawCalories = thisRows.reduce((s, r) => s + r.calories, 0);
  const totalCalories = Math.round(rawCalories);
  // One decimal, cut off rather than rounded (25.577 → 25.5) — that's how Apple Health
  // displays its daily average. The tiny epsilon keeps float error (25.6 stored as
  // 25.5999…) from cutting off one step too far.
  const avgCalories = Math.floor((rawCalories / 7) * 10 + 1e-9) / 10;
  const estimatedKm = Math.round(totalSteps * 0.000762 * 10) / 10;
  const totalXp = thisRows.reduce((s, r) => s + r.xp_earned, 0);

  // Last week aggregates for comparison
  const lastAvgSteps = Math.floor(lastRows.reduce((s, r) => s + r.steps, 0) / 7 + 1e-9);
  const lastCalories = lastRows.reduce((s, r) => s + r.calories, 0);
  const lastXp = lastRows.reduce((s, r) => s + r.xp_earned, 0);

  const noDataThisWeek = totalSteps === 0 && totalCalories === 0 && totalXp === 0;

  return {
    avgSteps,
    totalCalories,
    avgCalories,
    estimatedKm,
    totalXp,
    barData,
    avgStepsVsLastWeek: !noDataThisWeek && lastAvgSteps > 0 ? Math.round(((avgSteps - lastAvgSteps) / lastAvgSteps) * 100) : null,
    caloriesVsLastWeek: !noDataThisWeek && lastCalories > 0 ? Math.round(((totalCalories - lastCalories) / lastCalories) * 100) : null,
    xpVsLastWeek: !noDataThisWeek && lastXp > 0 ? totalXp - lastXp : null,
    noDataThisWeek,
  };
}

async function updateStreak(userId: string): Promise<number> {
  const today = todayISO();

  const { data, error } = await supabase
    .from('profiles')
    .select('streak_days, last_active_date')
    .eq('id', userId)
    .single();
  if (error) throw error;

  const row = data as { streak_days: number | null; last_active_date: string | null };
  if (row.last_active_date === today) {
    return row.streak_days ?? 0;
  }

  const yesterday = addDaysToISO(today, -1);
  const newStreak = row.last_active_date === yesterday ? (row.streak_days ?? 0) + 1 : 1;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ streak_days: newStreak, last_active_date: today })
    .eq('id', userId);
  if (updateError) throw updateError;

  return newStreak;
}


export async function updateMissionProgress(userMissionId: string, currentValue: number): Promise<void> {
  const { error } = await supabase
    .from('user_missions')
    .update({ current_value: currentValue })
    .eq('id', userMissionId);
  if (error) throw error;
}

export async function logMissionComplete(
  userMissionId: string,
  userId: string,
  goalValue: number,
  xpReward: number,
  currentXp: number,
  currentLevel: number,
): Promise<{ newXp: number; newLevel: number; newStreak: number }> {
  const { error: missionError } = await supabase
    .from('user_missions')
    .update({ current_value: goalValue, completed: true })
    .eq('id', userMissionId);
  if (missionError) throw missionError;

  await incrementDailyXp(userId, xpReward);
  const newStreak = await updateStreak(userId);

  const newXp = currentXp + xpReward;
  let newLevel = currentLevel;
  while (newXp >= xpForLevel(newLevel + 1)) {
    newLevel += 1;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ xp: newXp, level: newLevel })
    .eq('id', userId);
  if (profileError) throw profileError;

  return { newXp, newLevel, newStreak };
}
