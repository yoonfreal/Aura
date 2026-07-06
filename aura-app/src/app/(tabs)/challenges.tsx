import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '@/store/userStore';
import {
  fetchChallenges,
  fetchChallengeHistory,
  createTeam,
  joinTeam,
  deleteChallenge,
  inviteOpponent,
  inviteToTeam,
  respondToInvite,
  cancelInvite,
  claimReward,
  refreshStatsBasedProgress,
  countClaimableRewards,
  type ChallengeWithStatus,
  type ChallengeHistoryEntry,
} from '@/lib/challenges';
import { xpForLevel } from '@/lib/level';
import { ChallengeCard } from '@/components/ChallengeCard';
import { HeadToHeadCard } from '@/components/HeadToHeadCard';
import { ChallengeHistoryCard } from '@/components/ChallengeHistoryCard';
import { TeamJoinModal } from '@/components/TeamJoinModal';
import { TeamRosterModal } from '@/components/TeamRosterModal';
import { OpponentPickerModal } from '@/components/OpponentPickerModal';

type FilterPill = 'All' | 'Pending' | 'Team' | 'Individual' | 'Joined' | 'Sports' | '1v1' | 'Completed';
const FILTERS: FilterPill[] = ['All', 'Pending', 'Team', 'Individual', 'Joined', 'Sports', '1v1', 'Completed'];

const TYPE_LABEL: Record<ChallengeWithStatus['type'], string> = {
  individual: 'Individual',
  '1v1': '1v1',
  team: 'Team',
};

function matchesFilter(c: ChallengeWithStatus, filter: FilterPill): boolean {
  const category = c.category?.toLowerCase() ?? '';
  const isPendingInvite = c.participation?.status === 'pending';

  // Only counts as "done" once the reward is actually claimed — reaching the goal alone
  // isn't enough, for any challenge type.
  const isDone = !!c.participation?.claimed;

  if (filter === 'Completed') return isDone;
  if (filter === 'Pending') return isPendingInvite;
  // Finished challenges move to Completed, and invites awaiting your response move to
  // Pending — both drop out of every other filter so they don't clutter regular browsing.
  if (isDone || isPendingInvite) return false;

  switch (filter) {
    case 'All':
      return true;
    case 'Team':
      return c.type === 'team' || category.includes('team');
    case 'Individual':
      return c.type === 'individual' || category.includes('individual');
    case 'Sports':
      return category.includes('sport');
    case '1v1':
      return c.type === '1v1';
    case 'Joined':
      return !!c.participation;
  }
}

export default function ChallengesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const setClaimableCount = useUserStore((state) => state.setClaimableCount);
  const userId = user?.id;
  const userName = user?.username ?? 'You';
  const isAdmin = user?.role === 'admin';

  const [challenges, setChallenges] = useState<ChallengeWithStatus[]>([]);
  const [history, setHistory] = useState<ChallengeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    Promise.all([fetchChallenges(userId), fetchChallengeHistory(userId)])
      .then(([challengesData, historyData]) => {
        setChallenges(challengesData);
        setHistory(historyData);
        setLoading(false);
        // fetchChallenges already auto-enrolled/refreshed progress, so this just re-counts.
        countClaimableRewards(userId).then(setClaimableCount).catch(() => {});
      })
      .catch((err) => {
        console.error('fetchChallenges failed', err);
        setError(err?.message ?? 'Could not load challenges.');
        setLoading(false);
      });
  }, [userId]);

  useFocusEffect(load);

  async function handleClaim(challenge: ChallengeWithStatus) {
    if (!user || !challenge.participation) return;
    // Individual/1v1 deadlines are per-participant; team deadlines are shared on the team
    // itself, since the goal is collective.
    const myTeam =
      challenge.type === 'team'
        ? challenge.teams.find((t) => t.id === challenge.participation?.teamId)
        : undefined;
    const expiresAt = challenge.type === 'team' ? (myTeam?.expiresAt ?? null) : challenge.participation.expiresAt;
    try {
      const result = await claimReward(
        challenge.participation.id,
        user.id,
        challenge.xpReward,
        user.xp,
        user.level,
        expiresAt,
      );
      if (result) {
        setUser({
          ...user,
          xp: result.newXp,
          level: result.newLevel,
          xpForNextLevel: xpForLevel(result.newLevel + 1),
        });
        Alert.alert('Reward claimed!', `You earned ${challenge.xpReward} XP.`);
      }
      load();
    } catch (err) {
      console.error('claimReward failed', err);
      Alert.alert('Could not claim', (err as { message?: string })?.message ?? 'Please try again.');
    }
  }

  if (isAdmin) {
    return (
      <AdminChallengesView
        challenges={challenges}
        loading={loading}
        error={error}
        insetsTop={insets.top}
        onCreate={() => router.push('/admin/challenges/new')}
        onDelete={async (challenge) => {
          await deleteChallenge(challenge.id);
          load();
        }}
      />
    );
  }

  return (
    <UserChallengesView
      challenges={challenges}
      history={history}
      loading={loading}
      error={error}
      insetsTop={insets.top}
      userId={userId}
      userName={userName}
      onReload={load}
      onClaim={handleClaim}
    />
  );
}

// ── Admin: manage challenges (create / delete) — no join or participant UI ──

type AdminChallengesViewProps = {
  challenges: ChallengeWithStatus[];
  loading: boolean;
  error: string | null;
  insetsTop: number;
  onCreate: () => void;
  onDelete: (challenge: ChallengeWithStatus) => void;
};

function AdminChallengesView({
  challenges,
  loading,
  error,
  insetsTop,
  onCreate,
  onDelete,
}: AdminChallengesViewProps) {
  function confirmDelete(challenge: ChallengeWithStatus) {
    Alert.alert(
      'Delete challenge?',
      `"${challenge.title}" will be removed for everyone who joined it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(challenge) },
      ],
    );
  }

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insetsTop + 8 }]}>
        <Text style={styles.title}>Manage Challenges</Text>
        <TouchableOpacity style={[styles.iconBtn, styles.adminIconBtn]} onPress={onCreate}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={challenges}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.adminList}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No challenges yet — tap + to create one</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.adminCard}>
              <View style={styles.adminCardHeader}>
                <Text style={styles.adminCardTitle}>
                  {item.icon} {item.title}
                </Text>
                <TouchableOpacity onPress={() => confirmDelete(item)}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
              <Text style={styles.adminCardMeta}>
                {TYPE_LABEL[item.type]} · {item.goalValue.toLocaleString()} {item.goalUnit} ·{' '}
                {item.xpReward} XP
              </Text>
              <Text style={styles.adminCardDates}>
                {item.startDate} – {item.endDate}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

// ── Regular user: browse and join challenges ──

type UserChallengesViewProps = {
  challenges: ChallengeWithStatus[];
  history: ChallengeHistoryEntry[];
  loading: boolean;
  error: string | null;
  insetsTop: number;
  userId: string | undefined;
  userName: string;
  onReload: () => void;
  onClaim: (challenge: ChallengeWithStatus) => void;
};

function UserChallengesView({
  challenges,
  history,
  loading,
  error,
  insetsTop,
  userId,
  userName,
  onReload,
  onClaim,
}: UserChallengesViewProps) {
  const [filter, setFilter] = useState<FilterPill>('All');
  const [teamPickerChallenge, setTeamPickerChallenge] = useState<ChallengeWithStatus | null>(null);
  const [rosterChallenge, setRosterChallenge] = useState<ChallengeWithStatus | null>(null);
  const [opponentPickerChallenge, setOpponentPickerChallenge] = useState<ChallengeWithStatus | null>(null);
  const [teamInvitePickerChallenge, setTeamInvitePickerChallenge] = useState<ChallengeWithStatus | null>(null);

  const pinnedOneVOne = useMemo(
    () =>
      challenges.find(
        (c) =>
          c.type === '1v1' &&
          c.participation &&
          c.participation.status !== 'pending' &&
          !c.participation.claimed,
      ),
    [challenges],
  );

  const pendingCount = useMemo(
    () => challenges.filter((c) => c.participation?.status === 'pending').length,
    [challenges],
  );

  const listData = useMemo(
    () => challenges.filter((c) => c.id !== pinnedOneVOne?.id && matchesFilter(c, filter)),
    [challenges, pinnedOneVOne, filter],
  );

  async function handleJoinTeam(teamId: string) {
    if (!userId || !teamPickerChallenge) return;
    try {
      await joinTeam(userId, teamPickerChallenge.id, teamId);
      setTeamPickerChallenge(null);
      onReload();
    } catch (err) {
      console.error('joinTeam failed', err);
      Alert.alert('Could not join team', (err as { message?: string })?.message ?? 'Please try again.');
    }
  }

  async function handleCreateTeam(name: string) {
    if (!userId || !teamPickerChallenge) return;
    try {
      await createTeam(userId, teamPickerChallenge.id, name, teamPickerChallenge.durationDays);
      setTeamPickerChallenge(null);
      onReload();
    } catch (err) {
      console.error('createTeam failed', err);
      Alert.alert('Could not create team', (err as { message?: string })?.message ?? 'Please try again.');
    }
  }

  async function handleInvite(opponentId: string) {
    if (!userId || !opponentPickerChallenge) return;
    try {
      await inviteOpponent(userId, opponentPickerChallenge.id, opponentId);
      setOpponentPickerChallenge(null);
      onReload();
    } catch (err) {
      console.error('inviteOpponent failed', err);
      Alert.alert('Could not invite', (err as { message?: string })?.message ?? 'Please try again.');
    }
  }

  async function handleInviteToTeam(inviteeId: string) {
    if (!userId || !teamInvitePickerChallenge?.participation?.teamId) return;
    try {
      await inviteToTeam(
        userId,
        teamInvitePickerChallenge.id,
        teamInvitePickerChallenge.participation.teamId,
        inviteeId,
      );
      setTeamInvitePickerChallenge(null);
      onReload();
    } catch (err) {
      console.error('inviteToTeam failed', err);
      Alert.alert('Could not invite', (err as { message?: string })?.message ?? 'Please try again.');
    }
  }

  async function handleRespondToInvite(challenge: ChallengeWithStatus, accept: boolean) {
    if (!challenge.participation) return;
    try {
      await respondToInvite(challenge.participation.id, accept);
      if (accept && userId) await refreshStatsBasedProgress(userId);
      onReload();
    } catch (err) {
      console.error('respondToInvite failed', err);
      Alert.alert('Something went wrong', (err as { message?: string })?.message ?? 'Please try again.');
    }
  }

  async function handleCancelInvite(challenge: ChallengeWithStatus) {
    if (!userId || !challenge.opponent) return;
    try {
      await cancelInvite(challenge.id, userId, challenge.opponent.userId);
      onReload();
    } catch (err) {
      console.error('cancelInvite failed', err);
      Alert.alert('Could not cancel', (err as { message?: string })?.message ?? 'Please try again.');
    }
  }

  const myRosterTeam = rosterChallenge?.teams.find(
    (t) => t.id === rosterChallenge.participation?.teamId,
  );

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insetsTop + 8 }]}>
        <Text style={styles.title}>Challenges</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="person-add-outline" size={20} color="#1B2B4B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="chatbubble-outline" size={20} color="#1B2B4B" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.pillsWrap}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, filter === f && styles.pillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f}</Text>
            {f === 'Pending' && pendingCount > 0 && (
              <View style={styles.pillBadge}>
                <Text style={styles.pillBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            pinnedOneVOne ? (
              <HeadToHeadCard
                challenge={pinnedOneVOne}
                myName={userName}
                onInvite={() => setOpponentPickerChallenge(pinnedOneVOne)}
                onAccept={() => handleRespondToInvite(pinnedOneVOne, true)}
                onDecline={() => handleRespondToInvite(pinnedOneVOne, false)}
                onCancel={() => handleCancelInvite(pinnedOneVOne)}
                onClaim={() => onClaim(pinnedOneVOne)}
                onPlayAgain={() => setOpponentPickerChallenge(pinnedOneVOne)}
              />
            ) : null
          }
          ListEmptyComponent={
            filter === 'Completed' && history.length > 0 ? null : (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No challenges match this filter</Text>
              </View>
            )
          }
          renderItem={({ item }) =>
            item.type === '1v1' ? (
              <HeadToHeadCard
                challenge={item}
                myName={userName}
                onInvite={() => setOpponentPickerChallenge(item)}
                onAccept={() => handleRespondToInvite(item, true)}
                onDecline={() => handleRespondToInvite(item, false)}
                onCancel={() => handleCancelInvite(item)}
                onClaim={() => onClaim(item)}
                onPlayAgain={() => setOpponentPickerChallenge(item)}
              />
            ) : (
              <ChallengeCard
                challenge={item}
                onOpenTeamPicker={() => setTeamPickerChallenge(item)}
                onViewTeam={() => setRosterChallenge(item)}
                onInviteFriend={() => setTeamInvitePickerChallenge(item)}
                onClaim={() => onClaim(item)}
                onAcceptTeamInvite={() => handleRespondToInvite(item, true)}
                onDeclineTeamInvite={() => handleRespondToInvite(item, false)}
              />
            )
          }
          ListFooterComponent={
            filter === 'Completed' && history.length > 0 ? (
              <>
                {history.map((entry) => (
                  <ChallengeHistoryCard key={entry.id} entry={entry} />
                ))}
              </>
            ) : null
          }
        />
      )}

      <TeamJoinModal
        visible={!!teamPickerChallenge}
        teams={teamPickerChallenge?.teams ?? []}
        onClose={() => setTeamPickerChallenge(null)}
        onJoinTeam={handleJoinTeam}
        onCreateTeam={handleCreateTeam}
      />

      <TeamRosterModal
        visible={!!rosterChallenge}
        teamName={myRosterTeam?.name ?? ''}
        goalUnit={rosterChallenge?.goalUnit ?? ''}
        goalValue={rosterChallenge?.goalValue ?? 0}
        expiresAt={myRosterTeam?.expiresAt ?? null}
        members={myRosterTeam?.members ?? []}
        currentUserId={userId}
        onClose={() => setRosterChallenge(null)}
      />

      {userId && (
        <OpponentPickerModal
          visible={!!opponentPickerChallenge}
          currentUserId={userId}
          onClose={() => setOpponentPickerChallenge(null)}
          onInvite={handleInvite}
        />
      )}

      {userId && (
        <OpponentPickerModal
          visible={!!teamInvitePickerChallenge}
          currentUserId={userId}
          title="Invite a Friend"
          onClose={() => setTeamInvitePickerChallenge(null)}
          onInvite={handleInviteToTeam}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F4F8' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#0D1829', letterSpacing: -0.3 },
  headerIcons: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  adminIconBtn: { backgroundColor: '#1B2B4B' },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  pillActive: { backgroundColor: '#1B2B4B' },
  pillText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  pillTextActive: { color: '#fff' },
  pillBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBadgeText: { color: '#fff', fontWeight: '800', fontSize: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  errorText: { color: '#DC2626', fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 },
  list: { paddingBottom: 100 },
  adminList: { paddingHorizontal: 16, paddingBottom: 100 },
  adminCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  adminCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adminCardTitle: { fontSize: 15, fontWeight: '700', color: '#0D1829' },
  adminCardMeta: { fontSize: 12, color: '#6B7280', marginTop: 6, fontWeight: '600' },
  adminCardDates: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
});
