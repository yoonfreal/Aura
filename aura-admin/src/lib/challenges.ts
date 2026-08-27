import { supabase } from './supabase';
import type { Challenge, ChallengeType, NewChallenge } from './types';

type ChallengeRow = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  category: string | null;
  type: ChallengeType;
  goal_value: number;
  goal_unit: string;
  xp_reward: number;
  start_date: string;
  end_date: string;
  created_by: string;
  duration_days: number | null;
  badge_name: string | null;
  badge_icon: string | null;
};

function toChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    category: row.category,
    type: row.type,
    goalValue: row.goal_value,
    goalUnit: row.goal_unit,
    xpReward: row.xp_reward,
    startDate: row.start_date,
    endDate: row.end_date,
    createdBy: row.created_by,
    durationDays: row.duration_days,
    badgeName: row.badge_name,
    badgeIcon: row.badge_icon,
  };
}

export async function fetchAllChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ChallengeRow[]).map(toChallenge);
}

export type ChallengeParticipantCounts = { joined: number; completed: number };

export type ChallengeParticipantData = {
  // Per-challenge joined/completed counts — keyed by challenge_id, used for the table's
  // Joined/Completed columns and for the per-type completion rate (where counting the
  // same person once per challenge they joined is correct).
  countsByChallenge: Map<string, ChallengeParticipantCounts>;
  // Distinct people who have joined at least one challenge — someone in three challenges
  // counts once here, not three times, since this answers "how many people", not "how
  // many joins".
  totalParticipants: number;
};

// "Joined" means status = 'accepted' — the same definition aura-app uses for an active
// participant (pending invites and declines don't count).
export async function fetchChallengeParticipantData(): Promise<ChallengeParticipantData> {
  const { data, error } = await supabase
    .from('challenge_participants')
    .select('challenge_id, user_id, completed')
    .eq('status', 'accepted');

  if (error) throw error;

  const countsByChallenge = new Map<string, ChallengeParticipantCounts>();
  const uniqueUserIds = new Set<string>();
  for (const row of (data ?? []) as { challenge_id: string; user_id: string; completed: boolean }[]) {
    const entry = countsByChallenge.get(row.challenge_id) ?? { joined: 0, completed: 0 };
    entry.joined += 1;
    if (row.completed) entry.completed += 1;
    countsByChallenge.set(row.challenge_id, entry);
    uniqueUserIds.add(row.user_id);
  }
  return { countsByChallenge, totalParticipants: uniqueUserIds.size };
}

export async function fetchChallengeById(challengeId: string): Promise<Challenge> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single();

  if (error || !data) throw error ?? new Error('Challenge not found');
  return toChallenge(data as ChallengeRow);
}

export async function createChallenge(adminId: string, input: NewChallenge): Promise<Challenge> {
  const { data, error } = await supabase
    .from('challenges')
    .insert({
      title: input.title,
      description: input.description,
      icon: input.icon,
      category: input.category,
      type: input.type,
      goal_value: input.goalValue,
      goal_unit: input.goalUnit,
      xp_reward: input.xpReward,
      start_date: input.startDate,
      end_date: input.endDate,
      created_by: adminId,
      duration_days: input.durationDays,
      badge_name: input.badgeName,
      badge_icon: input.badgeIcon,
    })
    .select('*')
    .single();

  if (error || !data) throw error ?? new Error('Could not create challenge');
  return toChallenge(data as ChallengeRow);
}

export async function updateChallenge(challengeId: string, input: NewChallenge): Promise<Challenge> {
  const { data, error } = await supabase
    .from('challenges')
    .update({
      title: input.title,
      description: input.description,
      icon: input.icon,
      category: input.category,
      type: input.type,
      goal_value: input.goalValue,
      goal_unit: input.goalUnit,
      xp_reward: input.xpReward,
      start_date: input.startDate,
      end_date: input.endDate,
      duration_days: input.durationDays,
      badge_name: input.badgeName,
      badge_icon: input.badgeIcon,
    })
    .eq('id', challengeId)
    .select('*')
    .single();

  if (error || !data) throw error ?? new Error('Could not update challenge');
  return toChallenge(data as ChallengeRow);
}

export async function deleteChallenge(challengeId: string): Promise<void> {
  const { error } = await supabase.from('challenges').delete().eq('id', challengeId);
  if (error) throw error;
}
