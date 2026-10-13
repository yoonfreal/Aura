import { supabase } from '@/lib/supabase';
import { xpForLevel } from '@/lib/level';
import { incrementDailyXp } from '@/lib/api';
import {
  notifyChallengeComplete,
  notifyChallengeEndingSoon,
  notifyChallengeInvite,
  notifyChallengeResponse,
  notifyTeamInvite,
  notifyTeamMemberJoined,
} from '@/lib/notifications';
import { thailandDateISO } from '@/lib/thailandTime';
import type { Challenge, ChallengeTeam, ChallengeParticipant, ChallengeType, InviteStatus } from '@/types';

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
  sport: string | null;
};

type ParticipantRow = {
  id: string;
  challenge_id: string;
  user_id: string;
  team_id: string | null;
  opponent_id: string | null;
  status: InviteStatus;
  current_value: number;
  completed: boolean;
  claimed: boolean;
  expires_at: string | null;
};

type TeamRow = {
  id: string;
  challenge_id: string;
  name: string;
  created_by: string;
  expires_at: string | null;
};

type ProfileNameRow = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
};

export interface ChallengeParticipantWithName extends ChallengeParticipant {
  name: string;
}

export interface ChallengeWithStatus extends Challenge {
  participation: ChallengeParticipantWithName | null;
  opponent: ChallengeParticipantWithName | null;
  participantCount: number;
  teams: (ChallengeTeam & {
    memberCount: number;
    totalValue: number;
    members: { userId: string; name: string; currentValue: number }[];
  })[];
}

export interface ChallengeHistoryEntry {
  id: string;
  challengeId: string;
  challengeTitle: string;
  challengeIcon: string;
  goalUnit: string;
  opponentName: string | null;
  finalValue: number;
  opponentFinalValue: number | null;
  won: boolean;
  xpEarned: number;
  badgeName: string | null;
  badgeIcon: string | null;
  archivedAt: string;
}

function displayName(profile: ProfileNameRow | undefined): string {
  if (!profile) return 'Unknown';
  return (
    profile.username ||
    `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() ||
    'Unknown'
  );
}

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
    sport: row.sport,
  };
}

function toParticipant(row: ParticipantRow): ChallengeParticipant {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    userId: row.user_id,
    teamId: row.team_id,
    opponentId: row.opponent_id,
    status: row.status,
    currentValue: row.current_value,
    completed: row.completed,
    claimed: row.claimed,
    expiresAt: row.expires_at,
  };
}

function todayISODate(): string {
  return thailandDateISO();
}

async function autoEnrollIndividualChallenges(userId: string): Promise<void> {
  const today = todayISODate();

  const { data: openChallenges } = await supabase
    .from('challenges')
    .select('id')
    .eq('type', 'individual')
    .lte('start_date', today)
    .gte('end_date', today);

  const openIds = ((openChallenges ?? []) as { id: string }[]).map((c) => c.id);
  if (openIds.length === 0) return;

  const { data: existing } = await supabase
    .from('challenge_participants')
    .select('challenge_id')
    .eq('user_id', userId)
    .in('challenge_id', openIds);

  const alreadyEnrolled = new Set(((existing ?? []) as { challenge_id: string }[]).map((p) => p.challenge_id));
  const missingIds = openIds.filter((id) => !alreadyEnrolled.has(id));
  if (missingIds.length === 0) return;

  await supabase.from('challenge_participants').insert(
    missingIds.map((challengeId) => ({
      user_id: userId,
      challenge_id: challengeId,
      status: 'accepted',
      current_value: 0,
      completed: false,
      claimed: false,
    })),
  );
}

export async function fetchChallenges(userId: string): Promise<ChallengeWithStatus[]> {
  await autoEnrollIndividualChallenges(userId);
  await refreshStatsBasedProgress(userId);

  const { data: challengesData, error } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const challenges = (challengesData ?? []) as ChallengeRow[];
  if (challenges.length === 0) return [];

  const challengeIds = challenges.map((c) => c.id);

  const [{ data: participantsData }, { data: teamsData }] = await Promise.all([
    supabase.from('challenge_participants').select('*').in('challenge_id', challengeIds),
    supabase.from('challenge_teams').select('*').in('challenge_id', challengeIds),
  ]);

  const participants = (participantsData ?? []) as ParticipantRow[];
  const teams = (teamsData ?? []) as TeamRow[];

  const participantUserIds = [...new Set(participants.map((p) => p.user_id))];
  const { data: profilesData } = participantUserIds.length
    ? await supabase
        .from('profiles')
        .select('id, username, first_name, last_name')
        .in('id', participantUserIds)
    : { data: [] as ProfileNameRow[] };

  const profileById = new Map(
    ((profilesData ?? []) as ProfileNameRow[]).map((p) => [p.id, p]),
  );

  const withName = (p: ParticipantRow): ChallengeParticipantWithName => ({
    ...toParticipant(p),
    name: displayName(profileById.get(p.user_id)),
  });

  return challenges.map((row) => {
    const challengeParticipants = participants.filter((p) => p.challenge_id === row.id);
    const myParticipation = challengeParticipants.find((p) => p.user_id === userId);
    const opponentRow =
      row.type === '1v1' && myParticipation?.opponent_id
        ? challengeParticipants.find((p) => p.user_id === myParticipation.opponent_id)
        : undefined;

    const challengeTeams = teams
      .filter((t) => t.challenge_id === row.id)
      .map((t) => {
        // Pending invitees don't count toward the team until they accept.
        const members = participants.filter((p) => p.team_id === t.id && p.status === 'accepted');
        return {
          id: t.id,
          challengeId: t.challenge_id,
          name: t.name,
          createdBy: t.created_by,
          expiresAt: t.expires_at,
          memberCount: members.length,
          totalValue: members.reduce((sum, m) => sum + m.current_value, 0),
          members: members.map((m) => ({
            userId: m.user_id,
            name: displayName(profileById.get(m.user_id)),
            currentValue: m.current_value,
          })),
        };
      });

    return {
      ...toChallenge(row),
      participation: myParticipation ? withName(myParticipation) : null,
      opponent: opponentRow ? withName(opponentRow) : null,
      participantCount: challengeParticipants.length,
      teams: challengeTeams,
    };
  });
}

export function isChallengeExpired(challenge: ChallengeWithStatus): boolean {
  if (challenge.type === '1v1') return false;
  if (challenge.participation?.claimed) return false;
  if (challenge.participation?.status === 'declined') return false;

  const isTeam = challenge.type === 'team';
  const myTeam = isTeam ? challenge.teams.find((t) => t.id === challenge.participation?.teamId) : undefined;
  const currentValue = isTeam ? (myTeam?.totalValue ?? 0) : (challenge.participation?.currentValue ?? 0);
  const isCompleted = isTeam ? currentValue >= challenge.goalValue : (challenge.participation?.completed ?? false);
  if (isCompleted) return false;

  const expiresAt = isTeam ? (myTeam?.expiresAt ?? null) : `${challenge.endDate}T23:59:59`;
  return !!expiresAt && Date.now() > new Date(expiresAt).getTime();
}

const ENDING_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function checkChallengesEndingSoon(userId: string): Promise<void> {
  try {
    const { data: participantRows } = await supabase
      .from('challenge_participants')
      .select('challenge_id, team_id, claimed')
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .eq('completed', false);

    const activeRows = ((participantRows ?? []) as {
      challenge_id: string;
      team_id: string | null;
      claimed: boolean;
    }[]).filter((p) => !p.claimed);

    if (activeRows.length === 0) return;

    const challengeIds = activeRows.map((p) => p.challenge_id);

    const { data: challengesData } = await supabase
      .from('challenges')
      .select('id, type, end_date')
      .in('id', challengeIds);

    const challenges = (challengesData ?? []) as { id: string; type: ChallengeType; end_date: string }[];

    const teamIds = [...new Set(activeRows.map((p) => p.team_id).filter((id): id is string => !!id))];

    const { data: teamsData } = teamIds.length
      ? await supabase.from('challenge_teams').select('id, expires_at').in('id', teamIds)
      : { data: [] as { id: string; expires_at: string | null }[] };

    const teamExpiryById = new Map(
      ((teamsData ?? []) as { id: string; expires_at: string | null }[]).map((t) => [t.id, t.expires_at]),
    );

    const now = Date.now();

    for (const p of activeRows) {
      const challenge = challenges.find((c) => c.id === p.challenge_id);
      if (!challenge || challenge.type === '1v1') continue;

      const expiresAt =
        challenge.type === 'team'
          ? (p.team_id ? teamExpiryById.get(p.team_id) ?? null : null)
          : `${challenge.end_date}T23:59:59`;

      if (!expiresAt) continue;

      const msLeft = new Date(expiresAt).getTime() - now;
      if (msLeft > 0 && msLeft <= ENDING_SOON_WINDOW_MS) {
        await notifyChallengeEndingSoon(userId, p.challenge_id);
      }
    }
  } catch {
    // Best-effort nudge — never let this break app startup.
  }
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
  sport: string | null;
};

export async function createChallenge(
  adminId: string,
  input: NewChallenge,
): Promise<Challenge> {
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
      sport: input.sport,
    })
    .select()
    .single();

  if (error || !data) throw error ?? new Error('Failed to create challenge');

  return toChallenge(data as ChallengeRow);
}

export async function deleteChallenge(challengeId: string): Promise<void> {
  const { error } = await supabase.from('challenges').delete().eq('id', challengeId);
  if (error) throw error;
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

export async function updateChallenge(
  challengeId: string,
  input: NewChallenge,
): Promise<Challenge> {
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
      sport: input.sport,
    })
    .eq('id', challengeId)
    .select()
    .single();

  if (error || !data) throw error ?? new Error('Failed to update challenge');

  return toChallenge(data as ChallengeRow);
}

export type Open1v1Challenge = {
  id: string;
  title: string;
  icon: string;
  goalValue: number;
  goalUnit: string;
  xpReward: number;
};


export async function fetchOpen1v1Challenges(): Promise<Open1v1Challenge[]> {
  const today = todayISODate();

  const { data, error } = await supabase
    .from('challenges')
    .select('id, title, icon, goal_value, goal_unit, xp_reward')
    .eq('type', '1v1')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (
    (data ?? []) as { id: string; title: string; icon: string; goal_value: number; goal_unit: string; xp_reward: number }[]
  ).map((c) => ({
    id: c.id,
    title: c.title,
    icon: c.icon,
    goalValue: c.goal_value,
    goalUnit: c.goal_unit,
    xpReward: c.xp_reward,
  }));
}

export type LinkableChallenge = {
  id: string;
  title: string;
  icon: string;
  type: ChallengeType;
  description: string | null;
};


export async function fetchLinkableChallenges(): Promise<LinkableChallenge[]> {
  const today = todayISODate();

  const { data, error } = await supabase
    .from('challenges')
    .select('id, title, icon, type, description')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []) as LinkableChallenge[];
}

export type UserSearchResult = { id: string; name: string };

export async function searchUsers(query: string, excludeUserId: string): Promise<UserSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name')
    .ilike('username', `%${trimmed}%`)
    .neq('id', excludeUserId)
    .limit(10);

  return ((data ?? []) as ProfileNameRow[]).map((p) => ({ id: p.id, name: displayName(p) }));
}

type ArchiveJoinFields = { goal_value: number; xp_reward: number; badge_name: string | null; badge_icon: string | null };

async function archiveIfClaimed(challengeId: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('challenge_participants')
    .select('current_value, opponent_id, claimed, challenges!inner(goal_value, xp_reward, badge_name, badge_icon)')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

  const row = data as {
    current_value: number;
    opponent_id: string | null;
    claimed: boolean;
    challenges: ArchiveJoinFields | ArchiveJoinFields[];
  };
  if (!row.claimed) return;

  const challenge = Array.isArray(row.challenges) ? row.challenges[0] : row.challenges;
  if (!challenge) return;

  let opponentFinalValue: number | null = null;
  if (row.opponent_id) {
    const { data: oppRow } = await supabase
      .from('challenge_participants')
      .select('current_value')
      .eq('challenge_id', challengeId)
      .eq('user_id', row.opponent_id)
      .maybeSingle();
    opponentFinalValue = (oppRow as { current_value: number } | null)?.current_value ?? null;
  }

  const won = row.current_value >= challenge.goal_value;

  const { error: historyError } = await supabase.from('challenge_history').insert({
    challenge_id: challengeId,
    user_id: userId,
    opponent_id: row.opponent_id,
    final_value: row.current_value,
    opponent_final_value: opponentFinalValue,
    won,
    xp_earned: won ? challenge.xp_reward : 0,
    badge_name: won ? challenge.badge_name : null,
    badge_icon: won ? challenge.badge_icon : null,
  });
  if (historyError) throw historyError;
}

export async function inviteOpponent(
  userId: string,
  challengeId: string,
  opponentId: string,
): Promise<void> {

  await archiveIfClaimed(challengeId, userId);
  await archiveIfClaimed(challengeId, opponentId);

  const now = new Date().toISOString();
  const { error } = await supabase.from('challenge_participants').upsert(
    [
      {
        user_id: userId,
        challenge_id: challengeId,
        opponent_id: opponentId,
        status: 'accepted',
        current_value: 0,
        completed: false,
        claimed: false,
        joined_at: now,
      },
      {
        user_id: opponentId,
        challenge_id: challengeId,
        opponent_id: userId,
        status: 'pending',
        current_value: 0,
        completed: false,
        claimed: false,
        joined_at: now,
      },
    ],
    { onConflict: 'challenge_id,user_id' },
  );
  if (error) throw error;

  await notifyChallengeInvite(opponentId, userId, challengeId);
}

export async function cancelInvite(
  challengeId: string,
  userId: string,
  opponentId: string,
): Promise<void> {
  const { error } = await supabase
    .from('challenge_participants')
    .delete()
    .eq('challenge_id', challengeId)
    .in('user_id', [userId, opponentId]);
  if (error) throw error;
}

export async function respondToInvite(participantId: string, accept: boolean): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from('challenge_participants')
    .select('user_id, opponent_id, challenge_id, team_id')
    .eq('id', participantId)
    .single();
  if (fetchError) throw fetchError;
  const existingRow = existing as { user_id: string; opponent_id: string | null; challenge_id: string; team_id: string | null };

  if (!accept && existingRow.opponent_id && !existingRow.team_id) {
    const { error: deleteError } = await supabase
      .from('challenge_participants')
      .delete()
      .eq('challenge_id', existingRow.challenge_id)
      .in('user_id', [existingRow.user_id, existingRow.opponent_id]);
    if (deleteError) throw deleteError;

    await notifyChallengeResponse(existingRow.opponent_id, existingRow.user_id, existingRow.challenge_id, false);
    return;
  }

  const { data, error } = await supabase
    .from('challenge_participants')
    .update({
      status: accept ? 'accepted' : 'declined',
      ...(accept ? { joined_at: new Date().toISOString() } : {}),
    })
    .eq('id', participantId)
    .select('user_id, opponent_id, challenge_id, team_id')
    .single();
  if (error) throw error;

  const row = data as { user_id: string; opponent_id: string | null; challenge_id: string; team_id: string | null };
  if (row.opponent_id) {
    await notifyChallengeResponse(row.opponent_id, row.user_id, row.challenge_id, accept);
  }

  if (accept && row.opponent_id && !row.team_id) {
    const { error: resetError } = await supabase
      .from('challenge_participants')
      .update({
        current_value: 0,
        completed: false,
        claimed: false,
        joined_at: new Date().toISOString(),
      })
      .eq('challenge_id', row.challenge_id)
      .eq('user_id', row.opponent_id);
    if (resetError) throw resetError;
  }

  if (accept && row.team_id) {
    const { data: team } = await supabase
      .from('challenge_teams')
      .select('created_by')
      .eq('id', row.team_id)
      .single();
    const founderId = (team as { created_by: string } | null)?.created_by;
    if (founderId && founderId !== row.opponent_id) {
      await notifyTeamMemberJoined(founderId, row.user_id, row.challenge_id);
    }
  }
}

export async function createTeam(
  userId: string,
  challengeId: string,
  name: string,
  durationDays: number | null,
): Promise<ChallengeTeam> {
  const expiresAt = durationDays
    ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from('challenge_teams')
    .insert({ challenge_id: challengeId, name, created_by: userId, expires_at: expiresAt })
    .select()
    .single();

  if (error || !data) throw error ?? new Error('Failed to create team');

  const team = data as TeamRow;

  const { error: joinError } = await supabase.from('challenge_participants').upsert(
    {
      user_id: userId,
      challenge_id: challengeId,
      team_id: team.id,
      opponent_id: null,
      status: 'accepted',
      current_value: 0,
      completed: false,
      claimed: false,
      joined_at: new Date().toISOString(),
    },
    { onConflict: 'challenge_id,user_id' },
  );
  if (joinError) throw joinError;

  await refreshStatsBasedProgress(userId);

  return {
    id: team.id,
    challengeId: team.challenge_id,
    name: team.name,
    createdBy: team.created_by,
    expiresAt: team.expires_at,
  };
}

// Path B (Pokémon Go style): browse the open teams for this challenge and join whichever
// one you like — joins immediately, no invite or acceptance needed.
export async function joinTeam(
  userId: string,
  challengeId: string,
  teamId: string,
): Promise<void> {
  const { error } = await supabase.from('challenge_participants').upsert(
    {
      user_id: userId,
      challenge_id: challengeId,
      team_id: teamId,
      opponent_id: null,
      status: 'accepted',
      current_value: 0,
      completed: false,
      claimed: false,
      joined_at: new Date().toISOString(),
    },
    { onConflict: 'challenge_id,user_id' },
  );
  if (error) throw error;

  await refreshStatsBasedProgress(userId);

  const { data: team } = await supabase
    .from('challenge_teams')
    .select('created_by')
    .eq('id', teamId)
    .single();
  const founderId = (team as { created_by: string | null } | null)?.created_by;
  if (founderId) {
    await notifyTeamMemberJoined(founderId, userId, challengeId);
  }
}

// Path A: a team member invites a specific friend — they start 'pending' and must accept
// before they count as a member (reuses opponent_id to mean "who invited me").
export async function inviteToTeam(
  inviterId: string,
  challengeId: string,
  teamId: string,
  inviteeId: string,
): Promise<void> {
  const { error } = await supabase.from('challenge_participants').upsert(
    {
      user_id: inviteeId,
      challenge_id: challengeId,
      team_id: teamId,
      opponent_id: inviterId,
      status: 'pending',
      current_value: 0,
      completed: false,
      claimed: false,
    },
    { onConflict: 'challenge_id,user_id' },
  );
  if (error) throw error;

  await notifyTeamInvite(inviteeId, inviterId, challengeId);
}

export async function updateProgress(
  participantId: string,
  newValue: number,
  goalValue: number,
  userId: string,
  challengeId: string,
): Promise<{ completed: boolean }> {
  const completed = newValue >= goalValue;

  const { error } = await supabase
    .from('challenge_participants')
    .update({ current_value: newValue, completed })
    .eq('id', participantId);
  if (error) throw error;

  if (completed) {
    try {
      await notifyChallengeComplete(userId, challengeId);
    } catch (err) {
      console.error('notifyChallengeComplete failed', err);
    }
  }

  return { completed };
}

async function checkTeamCompletion(teamId: string, goalValue: number, challengeId: string): Promise<void> {
  const { data } = await supabase
    .from('challenge_participants')
    .select('current_value')
    .eq('team_id', teamId)
    .eq('status', 'accepted');

  const total = ((data ?? []) as { current_value: number }[]).reduce((sum, r) => sum + r.current_value, 0);
  if (total < goalValue) return;

  const { data: newlyCompleted, error } = await supabase
    .from('challenge_participants')
    .update({ completed: true })
    .eq('team_id', teamId)
    .eq('completed', false)
    .select('user_id');
  if (error) throw error;

  for (const { user_id } of (newlyCompleted ?? []) as { user_id: string }[]) {
    try {
      await notifyChallengeComplete(user_id, challengeId);
    } catch (err) {
      console.error('notifyChallengeComplete failed', err);
    }
  }
}

export async function countClaimableRewards(userId: string): Promise<number> {
  const { count } = await supabase
    .from('challenge_participants')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true)
    .eq('claimed', false);
  return count ?? 0;
}

export async function refreshClaimableCount(userId: string): Promise<number> {
  await autoEnrollIndividualChallenges(userId);
  await refreshStatsBasedProgress(userId);
  return countClaimableRewards(userId);
}

export async function claimReward(
  participantId: string,
  userId: string,
  xpReward: number,
  currentXp: number,
  currentLevel: number,
  expiresAt?: string | null,
): Promise<{ newXp: number; newLevel: number } | null> {
  if (expiresAt && Date.now() > new Date(expiresAt).getTime()) return null;

  const { data, error } = await supabase
    .from('challenge_participants')
    .update({ claimed: true })
    .eq('id', participantId)
    .eq('claimed', false)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) return null;

  await incrementDailyXp(userId, xpReward);

  const newXp = currentXp + xpReward;
  let newLevel = currentLevel;
  while (newXp >= xpForLevel(newLevel + 1)) {
    newLevel += 1;
  }

  await supabase.from('profiles').update({ xp: newXp, level: newLevel }).eq('id', userId);

  return { newXp, newLevel };
}

type ChallengeJoinFields = {
  goal_value: number;
  goal_unit: string;
  xp_reward: number;
  type: ChallengeType;
  start_date: string;
  end_date: string;
  sport: string | null;
};

type ParticipantWithChallengeRow = {
  id: string;
  challenge_id: string;
  team_id: string | null;
  current_value: number;
  opponent_id: string | null;
  expires_at: string | null;
  challenge_teams: { expires_at: string | null } | { expires_at: string | null }[] | null;
  challenges: ChallengeJoinFields | ChallengeJoinFields[];
};

//updates a student's progress in a 1v1 challenge
async function applyOneVOneProgress(
  row: ParticipantWithChallengeRow,
  newValue: number,
  challenge: ChallengeJoinFields,
  userId: string,
): Promise<void> {
  if (row.opponent_id) {
    const { data: opponentRow } = await supabase
      .from('challenge_participants')
      .select('completed, status')
      .eq('challenge_id', row.challenge_id)
      .eq('user_id', row.opponent_id)
      .maybeSingle();

    const opponent = opponentRow as { completed: boolean; status: string } | null;

    if (opponent?.status !== 'accepted') return;

    if (opponent.completed) {
      // Opponent already won this race — record progress, nothing to claim on our side.
      const { error } = await supabase
        .from('challenge_participants')
        .update({ current_value: newValue, completed: true, claimed: true })
        .eq('id', row.id);
      if (error) throw error;
      return;
    }
  }

  const reachedGoal = newValue >= challenge.goal_value;

  const { error: progressError } = await supabase
    .from('challenge_participants')
    .update({ current_value: newValue, completed: reachedGoal })
    .eq('id', row.id);
  if (progressError) throw progressError;

  if (!reachedGoal) return;

  try {
    await notifyChallengeComplete(userId, row.challenge_id);
  } catch (err) {
    console.error('notifyChallengeComplete failed', err);
  }

  if (!row.opponent_id) return;

  const { error: closeOutError } = await supabase
    .from('challenge_participants')
    .update({ completed: true, claimed: true })
    .eq('challenge_id', row.challenge_id)
    .eq('user_id', row.opponent_id)
    .eq('status', 'accepted')
    .eq('completed', false);
  if (closeOutError) throw closeOutError;
}

export async function syncChallengeProgressForUser(
  userId: string,
  goalUnit: string,
  value: number,
  sport?: string,
): Promise<void> {
  const normalizedUnit = goalUnit.trim().toLowerCase();
  if (normalizedUnit === 'steps' || normalizedUnit === 'calories') return;

  const { data } = await supabase
    .from('challenge_participants')
    .select('id, challenge_id, team_id, current_value, opponent_id, expires_at, challenge_teams(expires_at), challenges!inner(goal_value, goal_unit, xp_reward, type, start_date, end_date, sport)')
    .eq('user_id', userId)
    .eq('completed', false)
    .eq('status', 'accepted');

  const rows = (data ?? []) as ParticipantWithChallengeRow[];

  for (const row of rows) {
    const challenge = Array.isArray(row.challenges) ? row.challenges[0] : row.challenges;
    if (!challenge) continue;
    if (challenge.goal_unit.trim().toLowerCase() !== normalizedUnit) continue;
    // Sport-session challenges only count sessions of their own sport.
    if (sport !== undefined && challenge.sport !== sport) continue;

    const team = Array.isArray(row.challenge_teams) ? row.challenge_teams[0] : row.challenge_teams;
    const deadline = team?.expires_at ?? (challenge.type === 'individual' ? `${challenge.end_date}T23:59:59` : row.expires_at);
    if (deadline && Date.now() > new Date(deadline).getTime()) continue;

    const newValue = row.current_value + value;

    if (row.team_id) {
      const { error } = await supabase
        .from('challenge_participants')
        .update({ current_value: newValue })
        .eq('id', row.id);
      if (error) throw error;
      await checkTeamCompletion(row.team_id, challenge.goal_value, row.challenge_id);
    } else if (challenge.type === '1v1') {
      await applyOneVOneProgress(row, newValue, challenge, userId);
    } else {
      await updateProgress(row.id, newValue, challenge.goal_value, userId, row.challenge_id);
    }
  }
}

//It's another scorecard template, almost the same as ParticipantWithChallengeRow. This one is used for steps and calories challenges
//which data to use after joining a challenge
type StatsParticipantRow = {
  id: string;
  challenge_id: string;
  team_id: string | null;
  opponent_id: string | null;
  joined_at: string;
  current_value: number;
  expires_at: string | null;
  challenge_teams: { expires_at: string | null; created_at: string } | { expires_at: string | null; created_at: string }[] | null;
  challenges: ChallengeJoinFields | ChallengeJoinFields[];
};

export async function refreshStatsBasedProgress(userId: string): Promise<void> {
  const { data } = await supabase
    .from('challenge_participants')
    .select(
      'id, challenge_id, team_id, opponent_id, joined_at, current_value, expires_at, challenge_teams(expires_at, created_at), challenges!inner(goal_value, goal_unit, xp_reward, type, start_date, end_date, sport)',
    )
    .eq('user_id', userId)
    .eq('completed', false)
    .eq('status', 'accepted');

  const rows = ((data ?? []) as StatsParticipantRow[]).filter((row) => {
    const challenge = Array.isArray(row.challenges) ? row.challenges[0] : row.challenges;
    const unit = challenge?.goal_unit.trim().toLowerCase();
    return unit === 'steps' || unit === 'calories' || unit === 'km';
  });
  if (rows.length === 0) return;

  const { data: statsData } = await supabase
    .from('daily_stats')
    .select('date, steps, calories, distance_km')
    .eq('user_id', userId);
  const stats = (statsData ?? []) as { date: string; steps: number; calories: number; distance_km: number }[];

  for (const row of rows) {
    const challenge = Array.isArray(row.challenges) ? row.challenges[0] : row.challenges;
    if (!challenge) continue;
    const team = Array.isArray(row.challenge_teams) ? row.challenge_teams[0] : row.challenge_teams;

    const deadline = team?.expires_at ?? (challenge.type === 'individual' ? `${challenge.end_date}T23:59:59` : row.expires_at);
    if (deadline && Date.now() > new Date(deadline).getTime()) continue;

    const startDate = challenge.type === 'individual' ? challenge.start_date : thailandDateISO(new Date(row.joined_at));
    const unit = challenge.goal_unit.trim().toLowerCase();
    const column = unit === 'km' ? 'distance_km' : (unit as 'steps' | 'calories');
    const total = stats
      .filter((s) => s.date >= startDate)
      .reduce((acc, s) => acc + Number(s[column]), 0);
    
    const sum = unit === 'km' ? Math.round(total * 10) / 10 : total;

    if (row.team_id) {
      const { error } = await supabase
        .from('challenge_participants')
        .update({ current_value: sum })
        .eq('id', row.id);
      if (error) throw error;
      await checkTeamCompletion(row.team_id, challenge.goal_value, row.challenge_id);
    } else if (challenge.type === '1v1') {
      await applyOneVOneProgress(row, sum, challenge, userId);
    } else {
      await updateProgress(row.id, sum, challenge.goal_value, userId, row.challenge_id);
    }
  }
}

export type EarnedBadge = { label: string; icon: string; earned: boolean };

type BadgeDefRow = { badge_name: string | null; badge_icon: string | null };
type ParticipantBadgeRow = { challenges: BadgeDefRow | BadgeDefRow[] };

export async function fetchBadges(userId: string): Promise<EarnedBadge[]> {
  const { data: defsData } = await supabase
    .from('challenges')
    .select('badge_name, badge_icon')
    .not('badge_name', 'is', null);

  const iconByName = new Map<string, string>();
  for (const row of (defsData ?? []) as BadgeDefRow[]) {
    if (row.badge_name && !iconByName.has(row.badge_name)) {
      iconByName.set(row.badge_name, row.badge_icon ?? '🏅');
    }
  }

  const [{ data: participantData }, { data: historyData }] = await Promise.all([
    supabase
      .from('challenge_participants')
      .select('challenges!inner(badge_name, badge_icon)')
      .eq('user_id', userId)
      .eq('claimed', true),
    supabase
      .from('challenge_history')
      .select('badge_name, badge_icon')
      .eq('user_id', userId)
      .not('badge_name', 'is', null),
  ]);

  const earnedNames = new Set<string>();

  for (const row of (participantData ?? []) as ParticipantBadgeRow[]) {
    const challenge = Array.isArray(row.challenges) ? row.challenges[0] : row.challenges;
    if (challenge?.badge_name) earnedNames.add(challenge.badge_name);
  }
  for (const row of (historyData ?? []) as BadgeDefRow[]) {
    if (row.badge_name) earnedNames.add(row.badge_name);
  }

  return [...iconByName.entries()].map(([label, icon]) => ({
    label,
    icon,
    earned: earnedNames.has(label),
  }));
}

//a template for one challenge history
type HistoryRow = {
  id: string;
  challenge_id: string;
  opponent_id: string | null;
  final_value: number;
  opponent_final_value: number | null;
  won: boolean;
  xp_earned: number;
  badge_name: string | null;
  badge_icon: string | null;
  archived_at: string;
  challenges: { title: string; icon: string; goal_unit: string } | { title: string; icon: string; goal_unit: string }[];
};


export async function fetchChallengeHistory(userId: string): Promise<ChallengeHistoryEntry[]> {
  const { data, error } = await supabase
    .from('challenge_history')
    .select('id, challenge_id, opponent_id, final_value, opponent_final_value, won, xp_earned, badge_name, badge_icon, archived_at, challenges!inner(title, icon, goal_unit)')
    .eq('user_id', userId)
    .order('archived_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as HistoryRow[];
  const opponentIds = [...new Set(rows.map((r) => r.opponent_id).filter((id): id is string => !!id))];

  const { data: profilesData } = opponentIds.length
    ? await supabase.from('profiles').select('id, username, first_name, last_name').in('id', opponentIds)
    : { data: [] as ProfileNameRow[] };

  const profileById = new Map(((profilesData ?? []) as ProfileNameRow[]).map((p) => [p.id, p]));

  return rows.map((row) => {
    const challenge = Array.isArray(row.challenges) ? row.challenges[0] : row.challenges;
    return {
      id: row.id,
      challengeId: row.challenge_id,
      challengeTitle: challenge?.title ?? 'Challenge',
      challengeIcon: challenge?.icon ?? '🏆',
      goalUnit: challenge?.goal_unit ?? '',
      opponentName: row.opponent_id ? displayName(profileById.get(row.opponent_id)) : null,
      finalValue: row.final_value,
      opponentFinalValue: row.opponent_final_value,
      won: row.won,
      xpEarned: row.xp_earned,
      badgeName: row.badge_name,
      badgeIcon: row.badge_icon,
      archivedAt: row.archived_at,
    };
  });
}
