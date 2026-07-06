export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type FitnessGoal = 'lose_weight' | 'build_muscle' | 'improve_endurance' | 'stay_active';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
export type WorkoutExperience = 'beginner' | 'under_6_months' | '6_months_2_years' | '2_plus_years';
export type PreferredActivity = 'gym' | 'running' | 'yoga' | 'sports' | 'walking' | 'cycling';
export type DaysPerWeek = '1_2' | '3_4' | '5_6' | 'every_day';
export type PreferredTime = 'morning' | 'afternoon' | 'evening' | 'varies';

export interface OnboardingAnswers {
  age: number;
  gender: Gender;
  fitnessGoal: FitnessGoal;
  activityLevel: ActivityLevel;
  workoutExperience: WorkoutExperience;
  preferredActivities: PreferredActivity[];
  daysPerWeek: DaysPerWeek;
  preferredTime: PreferredTime;
}

export type MissionType = 'steps' | 'calories' | 'minutes' | 'photo';

export interface Mission {
  id: string;
  title: string;
  xpReward: number;
  goalValue: number;
  goalUnit: MissionType;
  icon: string;
  currentValue: number;
  completed: boolean;
}

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  username: string;
  xp: number;
  level: number;
  streak: number;
  xpForNextLevel: number;
  role: UserRole;
}

export interface DailyStats {
  steps: number;
  calories: number;
  streakDays: number;
  xpEarned: number;
}

export interface WatchSyncStatus {
  connected: boolean;
  lastSyncMinutesAgo: number;
}

export type ChallengeType = 'individual' | '1v1' | 'team';

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  category: string | null;
  type: ChallengeType;
  goalValue: number;
  goalUnit: string;
  xpReward: number;
  startDate: string;
  endDate: string;
  createdBy: string;
}

export interface ChallengeTeam {
  id: string;
  challengeId: string;
  name: string;
  createdBy: string;
}

export type InviteStatus = 'pending' | 'accepted' | 'declined';

export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  userId: string;
  teamId: string | null;
  opponentId: string | null;
  status: InviteStatus;
  currentValue: number;
  completed: boolean;
  claimed: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  xp: number;
  rank: number;
}

export interface WeeklyBarDay {
  day: string;
  xp: number;
}

export interface WeeklyStats {
  avgSteps: number;
  totalCalories: number;
  estimatedKm: number;
  totalXp: number;
  avgStepsVsLastWeek: number | null;
  caloriesVsLastWeek: number | null;
  xpVsLastWeek: number | null;
  barData: WeeklyBarDay[];
}
