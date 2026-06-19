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
type DailyStatRow = { steps: number; calories: number } | null;

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

  const rows = (data ?? []) as UserMissionRow[];

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
): Promise<Pick<DailyStats, 'steps' | 'calories'>> {
  const today = todayISO();

  const { data } = await supabase
    .from('daily_stats')
    .select('steps, calories')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  const row = data as DailyStatRow;

  return {
    steps: row?.steps ?? 0,
    calories: row?.calories ?? 0,
  };
}

type StatRow = { date: string; steps: number; calories: number };
type MissionXpRow = { date: string; missions: { xp_reward: number } | null };
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

function sumXp(rows: MissionXpRow[]): number {
  return rows.reduce((s, m) => s + (m.missions?.xp_reward ?? 0), 0);
}

export async function fetchWeeklyStats(userId: string): Promise<WeeklyStats> {
  const thisWeek = getWeekRange(0);
  const lastWeek = getWeekRange(-1);

  const [
    { data: thisStatsRaw },
    { data: lastStatsRaw },
    { data: thisMissionsRaw },
    { data: lastMissionsRaw },
  ] = await Promise.all([
    supabase.from('daily_stats').select('date, steps, calories').eq('user_id', userId).gte('date', thisWeek.start).lte('date', thisWeek.end),
    supabase.from('daily_stats').select('date, steps, calories').eq('user_id', userId).gte('date', lastWeek.start).lte('date', lastWeek.end),
    supabase.from('user_missions').select('date, missions(xp_reward)').eq('user_id', userId).eq('completed', true).gte('date', thisWeek.start).lte('date', thisWeek.end),
    supabase.from('user_missions').select('date, missions(xp_reward)').eq('user_id', userId).eq('completed', true).gte('date', lastWeek.start).lte('date', lastWeek.end),
  ]);

  const thisRows = (thisStatsRaw ?? []) as StatRow[];
  const lastRows = (lastStatsRaw ?? []) as StatRow[];
  const thisMissions = (thisMissionsRaw ?? []) as MissionXpRow[];
  const lastMissions = (lastMissionsRaw ?? []) as MissionXpRow[];

  // Build bar data: Mon–Sun mapped to XP earned each day
  const xpByDate: Record<string, number> = {};
  for (const m of thisMissions) {
    xpByDate[m.date] = (xpByDate[m.date] ?? 0) + (m.missions?.xp_reward ?? 0);
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
  const totalXp = sumXp(thisMissions);

  // Last week aggregates for comparison
  const lastTotalSteps = lastRows.reduce((s, r) => s + r.steps, 0);
  const lastActiveDays = lastRows.filter((r) => r.steps > 0).length;
  const lastAvgSteps = lastActiveDays > 0 ? Math.round(lastTotalSteps / lastActiveDays) : 0;
  const lastCalories = lastRows.reduce((s, r) => s + r.calories, 0);
  const lastXp = sumXp(lastMissions);

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

export async function logMissionComplete(
  userMissionId: string,
  userId: string,
  goalValue: number,
  xpReward: number,
  currentXp: number,
  currentLevel: number,
): Promise<{ newXp: number; newLevel: number }> {
  await supabase
    .from('user_missions')
    .update({ current_value: goalValue, completed: true })
    .eq('id', userMissionId);

  const newXp = currentXp + xpReward;
  let newLevel = currentLevel;
  while (newXp >= xpForLevel(newLevel + 1)) {
    newLevel += 1;
  }

  await supabase
    .from('profiles')
    .update({ xp: newXp, level: newLevel })
    .eq('id', userId);

  return { newXp, newLevel };
}
