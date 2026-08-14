import { supabase } from '@/lib/supabase';
import { xpForLevel } from '@/lib/level';
import { incrementDailyStat } from '@/lib/api';
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
  return new Date().toISOString().split('T')[0];
}

// Individual challenges no longer need an explicit "Join" — most users never check the
// Challenges tab, so requiring a tap before their real activity counts meant they'd walk
// 5,000 steps and never know a matching challenge was sitting there completed. Instead,
// every user is silently enrolled in every individual challenge that's currently open
// (today falls within its admin-set start/end window), the first time anything reads the
// challenge list — so progress and claimability are always accurate without anyone ever
// tapping Join. 1v1 and team still require explicitly engaging (matching an opponent /
// joining a team) since those aren't things the app can do on a user's behalf.
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

// 1v1 has no separate expiry of its own — it only ends when someone reaches the goal — so
// this only ever applies to individual (shared end_date) and team (shared expires_at)
// challenges. Already-claimed or already-completed rows are never "expired": that state
// only exists for someone who joined, missed the deadline, and has nothing to claim.
export function isChallengeExpired(challenge: ChallengeWithStatus): boolean {
  if (challenge.type === '1v1') return false;
  if (challenge.participation?.claimed) return false;

  const isTeam = challenge.type === 'team';
  const myTeam = isTeam ? challenge.teams.find((t) => t.id === challenge.participation?.teamId) : undefined;
  const currentValue = isTeam ? (myTeam?.totalValue ?? 0) : (challenge.participation?.currentValue ?? 0);
  const isCompleted = isTeam ? currentValue >= challenge.goalValue : (challenge.participation?.completed ?? false);
  if (isCompleted) return false;

  const expiresAt = isTeam ? (myTeam?.expiresAt ?? null) : `${challenge.endDate}T23:59:59`;
  return !!expiresAt && Date.now() > new Date(expiresAt).getTime();
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

// Lightweight listing of currently-open 1v1 challenge templates — used by the Social tab's
// "Challenge" shortcut, which already knows the opponent (the post's author) and just needs
// the user to pick which race to invite them to. Skips fetchChallenges' enrollment/progress
// side effects since nothing here needs them.
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

export type LinkableChallenge = { id: string; title: string; icon: string; type: ChallengeType };

// Any currently-open challenge (any type), for the Create Post composer's "Link to a
// challenge" picker — readers can jump into the Challenges tab from the post to join it.
export async function fetchLinkableChallenges(): Promise<LinkableChallenge[]> {
  const today = todayISODate();

  const { data, error } = await supabase
    .from('challenges')
    .select('id, title, icon, type')
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

// If this user already has a claimed (fully resolved) result on this challenge, snapshot
// it into challenge_history before it gets overwritten by a rematch — otherwise replaying
// would silently erase their past result.
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

// Creates a specific 1v1 pairing: the inviter is auto-accepted, the invited opponent
// starts 'pending' until they respond — no random matchmaking with whoever else joined.
export async function inviteOpponent(
  userId: string,
  challengeId: string,
  opponentId: string,
): Promise<void> {
  // Archive either side's previously-claimed result before resetting them for a fresh
  // round — a rematch must not silently overwrite (and lose) past history.
  await archiveIfClaimed(challengeId, userId);
  await archiveIfClaimed(challengeId, opponentId);

  // Upsert, not insert: a stale row can be left over from an earlier cancel/decline/rematch
  // that only partially cleaned up (RLS silently skips rows it can't touch on delete), so
  // this must fully overwrite — including claimed — rather than assume a clean slate.
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
      },
      {
        user_id: opponentId,
        challenge_id: challengeId,
        opponent_id: userId,
        status: 'pending',
        current_value: 0,
        completed: false,
        claimed: false,
      },
    ],
    { onConflict: 'challenge_id,user_id' },
  );
  if (error) throw error;
}

// Removes both sides of a pairing that hasn't turned into an active race yet — lets the
// inviter cancel a pending invite (or clear a declined one) and try again with someone else.
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
  const { error } = await supabase
    .from('challenge_participants')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', participantId);
  if (error) throw error;
}

// durationDays stamps one shared deadline for the whole team from the moment it's
// created — every member (whoever joins after) races against the same clock, since the
// goal is collective, unlike individual challenges where each person's clock starts on
// their own join.
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

  // Upsert: the creator could already have a stale row on this challenge (e.g. a declined
  // invite to a different team) — must fully reset it rather than assume a clean slate.
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
    },
    { onConflict: 'challenge_id,user_id' },
  );
  if (error) throw error;

  await refreshStatsBasedProgress(userId);
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
}

// Just records progress — reaching the goal only marks it eligible to claim. XP is
// awarded exclusively via claimReward(), never automatically, so the user must actively
// collect it before it moves to the Completed tab.
export async function updateProgress(
  participantId: string,
  newValue: number,
  goalValue: number,
): Promise<{ completed: boolean }> {
  const completed = newValue >= goalValue;

  const { error } = await supabase
    .from('challenge_participants')
    .update({ current_value: newValue, completed })
    .eq('id', participantId);
  if (error) throw error;

  return { completed };
}

// Powers the Challenges tab badge — a "completed" row is always claimable regardless of
// type (team members are never marked completed individually, and 1v1 losers are marked
// claimed automatically), so this stays a simple count with no per-type logic needed.
export async function countClaimableRewards(userId: string): Promise<number> {
  const { count } = await supabase
    .from('challenge_participants')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true)
    .eq('claimed', false);
  return count ?? 0;
}

// Single entry point for anywhere that needs an up-to-date claimable count without caring
// about the enrollment/sync plumbing underneath — the Home tab calls this on every load
// and after every mission log so the Challenges tab badge is correct without the user
// ever having to open that tab.
export async function refreshClaimableCount(userId: string): Promise<number> {
  await autoEnrollIndividualChallenges(userId);
  await refreshStatsBasedProgress(userId);
  return countClaimableRewards(userId);
}

// Awards a challenge's XP reward and marks it claimed. Safe to call more than once —
// the conditional update only succeeds the first time, so a double-tap can't double-pay.
// expiresAt guards against claiming a reward after the personal deadline passed — the UI
// already hides the claim button in that case, but this keeps it enforced either way.
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

  await incrementDailyStat(userId, 'xp_earned', xpReward);

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
};

type ParticipantWithChallengeRow = {
  id: string;
  challenge_id: string;
  current_value: number;
  opponent_id: string | null;
  expires_at: string | null;
  challenge_teams: { expires_at: string | null } | { expires_at: string | null }[] | null;
  challenges: ChallengeJoinFields | ChallengeJoinFields[];
};

// 1v1s are winner-take-all: only whoever reaches the goal first is even eligible to claim
// XP. Once one side finishes, the other side is closed out (and auto-marked claimed, since
// there's nothing for them to collect) so a later log can't also "win".
async function applyOneVOneProgress(
  row: ParticipantWithChallengeRow,
  newValue: number,
  challenge: ChallengeJoinFields,
): Promise<void> {
  if (row.opponent_id) {
    const { data: opponentRow } = await supabase
      .from('challenge_participants')
      .select('completed')
      .eq('challenge_id', row.challenge_id)
      .eq('user_id', row.opponent_id)
      .maybeSingle();

    if ((opponentRow as { completed: boolean } | null)?.completed) {
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

  if (!reachedGoal || !row.opponent_id) return;

  const { error: closeOutError } = await supabase
    .from('challenge_participants')
    .update({ completed: true, claimed: true })
    .eq('challenge_id', row.challenge_id)
    .eq('user_id', row.opponent_id)
    .eq('completed', false);
  if (closeOutError) throw closeOutError;
}

// Called whenever the user logs progress elsewhere (missions, HealthKit, etc.) so any
// challenge sharing that goal_unit advances too — not just data synced from Apple Watch.
// Only records progress — never awards XP, since that now only happens via claimReward().
// Steps/calories are excluded here: those are tracked against the user's real daily_stats
// total instead (see refreshStatsBasedProgress), so this only still applies to goal units
// with no daily_stats column (e.g. minutes, or a custom admin-defined unit).
export async function syncChallengeProgressForUser(
  userId: string,
  goalUnit: string,
  value: number,
): Promise<void> {
  const normalizedUnit = goalUnit.trim().toLowerCase();
  if (normalizedUnit === 'steps' || normalizedUnit === 'calories') return;

  const { data } = await supabase
    .from('challenge_participants')
    .select('id, challenge_id, current_value, opponent_id, expires_at, challenge_teams(expires_at), challenges!inner(goal_value, goal_unit, xp_reward, type, start_date, end_date)')
    .eq('user_id', userId)
    .eq('completed', false)
    .eq('status', 'accepted');

  const rows = (data ?? []) as ParticipantWithChallengeRow[];

  for (const row of rows) {
    const challenge = Array.isArray(row.challenges) ? row.challenges[0] : row.challenges;
    if (!challenge) continue;
    if (challenge.goal_unit.trim().toLowerCase() !== normalizedUnit) continue;

    // Individual challenges are shared: everyone races against the same admin-set end
    // date, no personal deadline. Team keeps its own shared deadline; 1v1 has none (it
    // only ends when someone reaches the goal).
    const team = Array.isArray(row.challenge_teams) ? row.challenge_teams[0] : row.challenge_teams;
    const deadline = team?.expires_at ?? (challenge.type === 'individual' ? `${challenge.end_date}T23:59:59` : row.expires_at);
    if (deadline && Date.now() > new Date(deadline).getTime()) continue;

    const newValue = row.current_value + value;

    if (challenge.type === '1v1') {
      await applyOneVOneProgress(row, newValue, challenge);
    } else {
      await updateProgress(row.id, newValue, challenge.goal_value);
    }
  }
}

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

// Steps/calories challenges (individual, team, and 1v1) track the user's real daily_stats
// total for the window — the same number shown on the Home tab — rather than an
// independent counter, so joining mid-day picks up whatever was already logged today, and
// progress can never drift from what the user actually did.
export async function refreshStatsBasedProgress(userId: string): Promise<void> {
  const { data } = await supabase
    .from('challenge_participants')
    .select(
      'id, challenge_id, team_id, opponent_id, joined_at, current_value, expires_at, challenge_teams(expires_at, created_at), challenges!inner(goal_value, goal_unit, xp_reward, type, start_date, end_date)',
    )
    .eq('user_id', userId)
    .eq('completed', false)
    .eq('status', 'accepted');

  const rows = ((data ?? []) as StatsParticipantRow[]).filter((row) => {
    const challenge = Array.isArray(row.challenges) ? row.challenges[0] : row.challenges;
    const unit = challenge?.goal_unit.trim().toLowerCase();
    return unit === 'steps' || unit === 'calories';
  });
  if (rows.length === 0) return;

  const { data: statsData } = await supabase
    .from('daily_stats')
    .select('date, steps, calories')
    .eq('user_id', userId);
  const stats = (statsData ?? []) as { date: string; steps: number; calories: number }[];

  for (const row of rows) {
    const challenge = Array.isArray(row.challenges) ? row.challenges[0] : row.challenges;
    if (!challenge) continue;
    const team = Array.isArray(row.challenge_teams) ? row.challenge_teams[0] : row.challenge_teams;

    // Individual challenges are shared: everyone races against the same admin-set
    // start/end window, no personal deadline. Team keeps its own shared deadline; 1v1
    // has none (it only ends when someone reaches the goal).
    const deadline = team?.expires_at ?? (challenge.type === 'individual' ? `${challenge.end_date}T23:59:59` : row.expires_at);
    if (deadline && Date.now() > new Date(deadline).getTime()) continue;

    const startDate = team?.created_at.split('T')[0]
      ?? (challenge.type === 'individual' ? challenge.start_date : row.joined_at.split('T')[0]);
    const unit = challenge.goal_unit.trim().toLowerCase() as 'steps' | 'calories';
    const sum = stats
      .filter((s) => s.date >= startDate)
      .reduce((acc, s) => acc + s[unit], 0);

    if (row.team_id) {
      // Team completion is derived client-side from the whole team's total, not any one
      // member's row — never mark an individual member "completed" here, or their own
      // contribution would freeze the moment their personal sum alone hit the team goal.
      const { error } = await supabase
        .from('challenge_participants')
        .update({ current_value: sum })
        .eq('id', row.id);
      if (error) throw error;
    } else if (challenge.type === '1v1') {
      await applyOneVOneProgress(row, sum, challenge);
    } else {
      await updateProgress(row.id, sum, challenge.goal_value);
    }
  }
}

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

// Past rounds of a 1v1 that were archived when the player hit Play Again — these are
// read-only records, not live challenges, so the Completed tab can show a full history
// instead of replaying overwriting the previous result.
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
