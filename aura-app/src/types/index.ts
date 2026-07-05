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
