import { supabase } from '@/lib/supabase';
import { xpForLevel } from '@/lib/level';
import type { Mission, DailyStats, WeeklyStats } from '@/types';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

type UserMissionRow = {
  id: string;
  current_value: number;
  completed: boolean;
  missions: {
    title: string;
    xp_reward: number;
    goal_value: number;
    goal_unit: string;
    icon: string;
  } | null;
};

type MissionTemplate = { id: string };
type DailyStatRow = { steps: number; calories: number; xp_earned: number } | null;

const FALLBACK_ICON: Record<string, string> = {
  steps: '🦶',
  calories: '🏋️',
  minutes: '⏱️',
  photo: '📸',
};

export async function fetchTodayMissions(userId: string): Promise<Mission[]> {
  const today = todayISO();

  // Check if today's user_missions already exist
  const { data: existing } = await supabase
    .from('user_missions')
    .select('id')
    .eq('user_id', userId)
    .eq('date', today);

  if (!existing || existing.length === 0) {
    const { data: templates } = await supabase
      .from('missions')
      .select('id');

    if (templates && templates.length > 0) {
      await supabase.from('user_missions').insert(
        (templates as MissionTemplate[]).map((t) => ({
          user_id: userId,
          mission_id: t.id,
          date: today,
          current_value: 0,
          completed: false,
        })),
      );
    }
  }

  const { data } = await supabase
    .from('user_missions')
    .select(
      'id, current_value, completed, missions(title, xp_reward, goal_value, goal_unit, icon)',
    )
    .eq('user_id', userId)
    .eq('date', today);

  const rows = (data ?? []) as unknown as UserMissionRow[];

  return rows
    .filter((row) => row.missions !== null)
    .map((row) => ({
      id: row.id,
      title: row.missions!.title,
      xpReward: row.missions!.xp_reward,
      goalValue: row.missions!.goal_value,
      goalUnit: row.missions!.goal_unit as Mission['goalUnit'],
      icon: row.missions!.icon || FALLBACK_ICON[row.missions!.goal_unit] || '🏅',
      currentValue: row.current_value,
      completed: row.completed,
    }));
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

type DailyStatFields = { steps: number; calories: number; xp_earned: number };

// Bumps today's daily_stats row so Daily/Weekly stats reflect XP/steps/calories right now —
// missions call this for xp_earned (and steps/calories), challenge claims call it for
// xp_earned too, since HealthKit isn't wired up yet to sync any of this automatically.
export async function incrementDailyStat(
  userId: string,
  field: 'steps' | 'calories' | 'xp_earned',
  amount: number,
): Promise<DailyStatFields> {
  const today = todayISO();

  const { data: existing, error: selectError } = await supabase
    .from('daily_stats')
    .select('id, steps, calories, xp_earned')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
  if (selectError) throw selectError;

  const row = existing as ({ id: string } & DailyStatFields) | null;
  const steps = (row?.steps ?? 0) + (field === 'steps' ? amount : 0);
  const calories = (row?.calories ?? 0) + (field === 'calories' ? amount : 0);
  const xp_earned = (row?.xp_earned ?? 0) + (field === 'xp_earned' ? amount : 0);

  const { error: writeError } = row
    ? await supabase.from('daily_stats').update({ steps, calories, xp_earned }).eq('id', row.id)
    : await supabase.from('daily_stats').insert({ user_id: userId, date: today, steps, calories, xp_earned });
  if (writeError) throw writeError;

  return { steps, calories, xp_earned };
}

type StatRow = { date: string; steps: number; calories: number; xp_earned: number };
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekRange(offsetWeeks = 0): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((dayOfWeek + 6) % 7) + offsetWeeks * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(monday), end: fmt(sunday) };
}

export async function fetchWeeklyStats(userId: string): Promise<WeeklyStats> {
  const thisWeek = getWeekRange(0);
  const lastWeek = getWeekRange(-1);

  const [{ data: thisStatsRaw, error: thisError }, { data: lastStatsRaw, error: lastError }] = await Promise.all([
    supabase.from('daily_stats').select('date, steps, calories, xp_earned').eq('user_id', userId).gte('date', thisWeek.start).lte('date', thisWeek.end),
    supabase.from('daily_stats').select('date, steps, calories, xp_earned').eq('user_id', userId).gte('date', lastWeek.start).lte('date', lastWeek.end),
  ]);
  if (thisError) throw thisError;
  if (lastError) throw lastError;

  const thisRows = (thisStatsRaw ?? []) as StatRow[];
  const lastRows = (lastStatsRaw ?? []) as StatRow[];

  // Build bar data: Mon–Sun mapped to XP earned each day (missions + claimed challenges)
  const xpByDate: Record<string, number> = {};
  for (const r of thisRows) {
    xpByDate[r.date] = r.xp_earned;
  }
  const mondayUTC = new Date(thisWeek.start + 'T00:00:00Z');
  const barData = WEEK_DAYS.map((day, i) => {
    const d = new Date(mondayUTC);
    d.setUTCDate(mondayUTC.getUTCDate() + i);
    return { day, xp: xpByDate[d.toISOString().split('T')[0]] ?? 0 };
  });

  // This week aggregates
  const totalSteps = thisRows.reduce((s, r) => s + r.steps, 0);
  const activeDays = thisRows.filter((r) => r.steps > 0).length;
  const avgSteps = activeDays > 0 ? Math.round(totalSteps / activeDays) : 0;
  const totalCalories = thisRows.reduce((s, r) => s + r.calories, 0);
  const estimatedKm = Math.round(totalSteps * 0.000762 * 10) / 10;
  const totalXp = thisRows.reduce((s, r) => s + r.xp_earned, 0);

  // Last week aggregates for comparison
  const lastTotalSteps = lastRows.reduce((s, r) => s + r.steps, 0);
  const lastActiveDays = lastRows.filter((r) => r.steps > 0).length;
  const lastAvgSteps = lastActiveDays > 0 ? Math.round(lastTotalSteps / lastActiveDays) : 0;
  const lastCalories = lastRows.reduce((s, r) => s + r.calories, 0);
  const lastXp = lastRows.reduce((s, r) => s + r.xp_earned, 0);

  return {
    avgSteps,
    totalCalories,
    estimatedKm,
    totalXp,
    barData,
    avgStepsVsLastWeek: lastAvgSteps > 0 ? Math.round(((avgSteps - lastAvgSteps) / lastAvgSteps) * 100) : null,
    caloriesVsLastWeek: lastCalories > 0 ? Math.round(((totalCalories - lastCalories) / lastCalories) * 100) : null,
    xpVsLastWeek: lastXp > 0 ? totalXp - lastXp : null,
  };
}

// Bumps streak_days once per calendar day: +1 if the user was also active yesterday,
// reset to 1 if there's a gap (or this is the first day ever), unchanged if already
// counted today. Called from logMissionComplete since that's the one "did something
// today" moment the app already gates XP on.
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

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const newStreak = row.last_active_date === yesterday ? (row.streak_days ?? 0) + 1 : 1;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ streak_days: newStreak, last_active_date: today })
    .eq('id', userId);
  if (updateError) throw updateError;

  return newStreak;
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

  await incrementDailyStat(userId, 'xp_earned', xpReward);
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
