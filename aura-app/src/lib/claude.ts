import { supabase } from '@/lib/supabase';
//uses supabase functions to talk to AI, not directly
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

//what AI sends back
export type ReportInsight = {
  recap: string;
  recommendations: ReportRecommendation[];
};

//asks the AI (Claude) to write the student's weekly report card
export async function fetchReportInsight(stats: ReportInsightStats): Promise<ReportInsight | null> {
  try {
    //call the server's function
    const { data, error } = await supabase.functions.invoke<ReportInsight>(
      'ai-report-card',
      { body: stats },//send the stats
    );
    if (error || !data?.recap || !data.recommendations?.length) return null;
    return data;
  } catch {
    return null;
  }
}
