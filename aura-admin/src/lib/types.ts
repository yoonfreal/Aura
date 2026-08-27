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
  durationDays: number | null;
  badgeName: string | null;
  badgeIcon: string | null;
}

export type NewChallenge = {
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
  durationDays: number | null;
  badgeName: string | null;
  badgeIcon: string | null;
};
