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

export interface User {
  id: string;
  email: string;
  username: string;
  xp: number;
  level: number;
  streak: number;
  xpForNextLevel: number;
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

export interface Challenge {
  id: string;
  title: string;
  type: '1v1' | 'team';
  participants: string[];
  xpReward: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  xp: number;
  rank: number;
}
