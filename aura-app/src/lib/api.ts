import { supabase } from '@/lib/supabase';
import { xpForLevel } from '@/lib/level';
import { notifyStreakReminder } from '@/lib/notifications';
import { addDaysToISO, thailandDateISO, thailandHour, thailandWeekRange } from '@/lib/thailandTime';
import type { Mission, DailyStats, WeeklyStats, WeeklyBarDay } from '@/types';

function todayISO(): string {
  return thailandDateISO();
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

// Guarantees a daily_stats row exists for today the moment the app opens, even if the
// user never completes a mission or claims a challenge — otherwise daily_stats only
// reflects "did something," not "opened the app," which is what admin's daily active
// users chart needs. Silently no-ops on failure so a hiccup here never blocks login.
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
    // Best-effort activity ping — never let this break app startup.
  }
}

// Powers admin's Active/Offline column — a user is "Active" if their last_seen_at is
// recent (see _layout.tsx's ping interval), "Offline" otherwise. Best-effort, silently
// no-ops on failure since presence is a nice-to-have, never something to block on.
export async function updateLastSeen(userId: string): Promise<void> {
  try {
    await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId);
  } catch {
    // Best-effort presence ping.
  }
}

// Nudges the user once per Thailand-calendar day, after 6 PM Thailand time, if they
// haven't logged any activity yet today — "today" here matches the same Thailand-day
// definition updateStreak uses for last_active_date, so this only fires once the day
// updateStreak itself would consider still open. Best-effort, silently no-ops on failure
// since this is a nice-to-have, never something to block app startup on.
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
    // Best-effort nudge.
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

type DailyStatFields = { steps: number; calories: number; xp_earned: number };

// Bumps today's daily_stats row so Daily/Weekly stats reflect XP/steps/calories right now —
// missions call this for xp_earned (and steps/calories), challenge claims call it for
// xp_earned too, since HealthKit isn't wired up yet to sync any of this automatically.
// Unusual-activity flagging (steps/calories/XP thresholds) lives in a Postgres trigger on
// daily_stats, not here — that way it fires no matter what writes the row (this function,
// a future HealthKit sync, or a direct edit), not just this one call site.
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

export async function fetchWeeklyStats(userId: string): Promise<WeeklyStats> {
  const thisWeek = thailandWeekRange(0);
  const lastWeek = thailandWeekRange(-1);

  const [{ data: thisStatsRaw, error: thisError }, { data: lastStatsRaw, error: lastError }] = await Promise.all([
    supabase.from('daily_stats').select('date, steps, calories, xp_earned').eq('user_id', userId).gte('date', thisWeek.start).lte('date', thisWeek.end),
    supabase.from('daily_stats').select('date, steps, calories, xp_earned').eq('user_id', userId).gte('date', lastWeek.start).lte('date', lastWeek.end),
  ]);
  if (thisError) throw thisError;
  if (lastError) throw lastError;

  const thisRows = (thisStatsRaw ?? []) as StatRow[];
  const lastRows = (lastStatsRaw ?? []) as StatRow[];

  // Build bar data: Mon–Sun mapped to each day's totals — carries steps/calories alongside
  // xp (not just xp) so tapping a bar in the UI can show that day's full breakdown.
  const statsByDate = new Map(thisRows.map((r) => [r.date, r]));
  const barData: WeeklyBarDay[] = WEEK_DAYS.map((day, i) => {
    const date = addDaysToISO(thisWeek.start, i);
    const stat = statsByDate.get(date);
    return { day, date, xp: stat?.xp_earned ?? 0, steps: stat?.steps ?? 0, calories: stat?.calories ?? 0 };
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

  const yesterday = addDaysToISO(today, -1);
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
