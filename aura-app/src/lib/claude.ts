import { supabase } from '@/lib/supabase';

type DayActivity = {
  day: string;
  steps: number;
  calories: number;
  xp: number;
};

type ReportInsightStats = {
  days: DayActivity[];
  totalSteps: number;
  totalCalories: number;
  totalXpThisWeek: number;
  avgStepsVsLastWeek: number | null;
  caloriesVsLastWeek: number | null;
  streakDays: number;
  level: number;
  xpNeeded: number;
  nextLevel: number;
};

export type ReportRecommendation = { title: string; detail: string };

export type ReportInsight = {
  recap: string;
  recommendations: ReportRecommendation[];
};

// Calls the ai-report-card Supabase Edge Function, which holds the Claude API key —
// never call Claude directly from the client. Returns null on any failure so the report
// card can fall back to showing just the real stats without the AI recap.
export async function fetchReportInsight(stats: ReportInsightStats): Promise<ReportInsight | null> {
  try {
    const { data, error } = await supabase.functions.invoke<ReportInsight>(
      'ai-report-card',
      { body: stats },
    );
    if (error || !data?.recap || !data.recommendations?.length) return null;
    return data;
  } catch {
    return null;
  }
}
