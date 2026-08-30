import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Animated,
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
  isChallengeExpired,
  type ChallengeWithStatus,
  type ChallengeHistoryEntry,
} from '@/lib/challenges';

import { xpForLevel } from '@/lib/level';
import { countIncomingRequests } from '@/lib/friends';

import {
  countUnreadNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  notificationLinksToChallenge,
  SOCIAL_NOTIFICATION_TYPES,
  type AppNotification,
} from '@/lib/notifications';

import { ChallengeCard } from '@/components/ChallengeCard';
import { HeadToHeadCard } from '@/components/HeadToHeadCard';
import { ChallengeHistoryCard } from '@/components/ChallengeHistoryCard';
import { TeamJoinModal } from '@/components/TeamJoinModal';
import { TeamRosterModal } from '@/components/TeamRosterModal';
import { OpponentPickerModal } from '@/components/OpponentPickerModal';
import { NotificationsModal } from '@/components/NotificationsModal';


/* =========================================================
   FILTERS
========================================================= */

type FilterPill =
  | 'All'
  | 'Ongoing'
  | 'Pending'
  | 'Completed'
  | 'Team'
  | 'Individual'
  | '1v1';

// The main panel — Team/Individual/1v1 each expose a different set of sub-panels below
// them: only 1v1 has a "Pending" sub-panel (waiting on the opponent to accept). The
// top-level "All" main panel has no sub-panels at all: it just shows everything.
const MAIN_FILTERS: FilterPill[] = [
  'All',
  'Team',
  'Individual',
  '1v1',
];

const SUB_FILTERS: Partial<Record<FilterPill, FilterPill[]>> = {
  Team: ['All', 'Ongoing', 'Completed'],
  Individual: ['All', 'Ongoing', 'Completed'],
  '1v1': ['All', 'Ongoing', 'Pending', 'Completed'],
};

// The sub-panel to land on right after switching main panels.
const DEFAULT_SUB_FILTER: Partial<Record<FilterPill, FilterPill>> = {
  Team: 'All',
  Individual: 'All',
  '1v1': 'All',
};


/* =========================================================
   TYPE LABEL
========================================================= */

const TYPE_LABEL: Record<
  ChallengeWithStatus['type'],
  string
> = {
  individual: 'Individual',
  '1v1': '1v1',
  team: 'Team',
};


/* =========================================================
   FILTER LOGIC
========================================================= */

function matchesFilter(
  c: ChallengeWithStatus,
  mainFilter: FilterPill,
  subFilter: FilterPill
): boolean {
  // Pending covers both directions of "still waiting on a response": the invitee's own
  // row sitting at 'pending' (them being the one who needs to act), and — for 1v1 only,
  // via c.opponent — the inviter's side while their sent invite hasn't been answered yet
  // (their own row is 'accepted' immediately on send, so it'd otherwise land in Ongoing
  // even though there's no race happening yet).
  const isPendingInvite =
    c.participation?.status === 'pending' ||
    c.opponent?.status === 'pending';

  // Declining an invite must not make the card vanish from wherever the user was just
  // looking at it (the Pending tab, almost always) — it stays put there, now showing a
  // "declined" state instead of the accept/decline banner, rather than disappearing.
  const isDeclinedInvite =
    c.participation?.status === 'declined';

  const isDone =
    !!c.participation?.claimed;

  const isExpired =
    isChallengeExpired(c);

  /*
   * -------------------------------
   * MAIN (TYPE) FILTER
   * -------------------------------
   *
   * "All" means don't filter by type.
   */

  if (
    mainFilter !== 'All' &&
    c.type !== mainFilter.toLowerCase()
  ) {
    return false;
  }

  /*
   * -------------------------------
   * EXPIRED
   * -------------------------------
   *
   * A challenge only reports as "expired" once it's missed its deadline with nothing to
   * claim (isChallengeExpired already ignores claimed/completed rows) — that's dead
   * weight in every view, not just "Ongoing", so it's hidden everywhere.
   */

  if (isExpired) {
    return false;
  }

  /*
   * -------------------------------
   * SUB (STATUS) FILTER
   * -------------------------------
   *
   * Only Team/Individual/1v1 have sub-panels — the "All" main panel shows every
   * status for that type (sorting puts completed ones last instead of hiding them).
   */

  if (mainFilter === 'All') {
    return true;
  }

  if (subFilter === 'Completed') {
    if (!isDone) {
      return false;
    }
  }

  if (subFilter === 'Pending') {
    if (!isPendingInvite && !isDeclinedInvite) {
      return false;
    }
  }

  if (subFilter === 'Ongoing') {
    /*
     * A challenge is ongoing when:
     * - user has joined
     * - invitation is not pending
     * - reward has not been claimed
     * (expired is already excluded above)
     */
    if (
      !c.participation ||
      isPendingInvite ||
      isDone
    ) {
      return false;
    }
  }

  return true;
}

// Goal reached but reward not yet collected — the "Claim" button is showing on this card.
function isClaimable(c: ChallengeWithStatus): boolean {
  return !!c.participation?.completed && !c.participation?.claimed;
}

// Claimable rewards float to the top everywhere, and fully claimed/completed challenges
// sink to the bottom everywhere — including the "All" panels, where nothing else already
// filters completed challenges out of view. Views that are already status-filtered to a
// single bucket (e.g. sub-panel "Completed") end up with every item at the same rank,
// which is a no-op for a stable sort.
function challengeSortRank(c: ChallengeWithStatus): number {
  if (isClaimable(c)) return 0;
  if (c.participation?.claimed) return 2;
  return 1;
}


/* =========================================================
   MAIN SCREEN
========================================================= */

export default function ChallengesScreen() {
  const router = useRouter();

  const insets =
    useSafeAreaInsets();

  const user =
    useUserStore((state) => state.user);

  const setUser =
    useUserStore((state) => state.setUser);

  const setClaimableCount =
    useUserStore(
      (state) => state.setClaimableCount
    );

  const setFriendRequestCount =
    useUserStore(
      (state) => state.setFriendRequestCount
    );

  const setNotificationCount =
    useUserStore(
      (state) => state.setNotificationCount
    );

  const setSocialNotificationCount =
    useUserStore(
      (state) => state.setSocialNotificationCount
    );

  const userId =
    user?.id;

  const userName =
    user?.username ?? 'You';

  const isAdmin =
    user?.role === 'admin';


  const [
    challenges,
    setChallenges,
  ] = useState<
    ChallengeWithStatus[]
  >([]);

  const [
    history,
    setHistory,
  ] = useState<
    ChallengeHistoryEntry[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);


  /* =====================================================
     LOAD CHALLENGES
  ===================================================== */

  const load =
    useCallback(() => {

      if (!userId) {
        return;
      }

      setLoading(true);
      setError(null);

      Promise.all([
        fetchChallenges(userId),
        fetchChallengeHistory(userId),
      ])
        .then(
          ([
            challengesData,
            historyData,
          ]) => {

            setChallenges(
              challengesData
            );

            setHistory(
              historyData
            );

            setLoading(false);


            // Update claimable rewards
            countClaimableRewards(
              userId
            )
              .then(setClaimableCount)
              .catch(() => {});


            // Update friend request count
            countIncomingRequests(
              userId
            )
              .then(
                setFriendRequestCount
              )
              .catch(() => {});


            // Update notification count
            countUnreadNotifications(
              userId
            )
              .then(setNotificationCount)
              .catch(() => {});

            countUnreadNotifications(
              userId,
              SOCIAL_NOTIFICATION_TYPES
            )
              .then(setSocialNotificationCount)
              .catch(() => {});
          }
        )
        .catch((err) => {

          console.error(
            'fetchChallenges failed',
            err
          );

          setError(
            err?.message ??
              'Could not load challenges.'
          );

          setLoading(false);
        });

    }, [
      userId,
      setClaimableCount,
      setFriendRequestCount,
      setNotificationCount,
      setSocialNotificationCount,
    ]);


  useFocusEffect(load);


  /* =====================================================
     CLAIM REWARD
  ===================================================== */

  async function handleClaim(
    challenge: ChallengeWithStatus
  ) {

    if (
      !user ||
      !challenge.participation
    ) {
      return;
    }


    /*
     * Individual / 1v1 deadlines are
     * per participant.
     *
     * Team deadlines are shared
     * on the team.
     */

    const myTeam =
      challenge.type === 'team'
        ? challenge.teams.find(
            (t) =>
              t.id ===
              challenge.participation
                ?.teamId
          )
        : undefined;


    const expiresAt =
      challenge.type === 'team'
        ? (
            myTeam?.expiresAt ??
            null
          )
        : challenge
            .participation
            .expiresAt;


    try {

      const result =
        await claimReward(
          challenge.participation.id,
          user.id,
          challenge.xpReward,
          user.xp,
          user.level,
          expiresAt
        );


      if (result) {

        setUser({
          ...user,
          xp: result.newXp,
          level: result.newLevel,
          xpForNextLevel:
            xpForLevel(
              result.newLevel + 1
            ),
        });


        Alert.alert(
          'Reward claimed!',

          challenge.badgeName
            ? `You earned ${challenge.xpReward} XP and the "${challenge.badgeName}" ${challenge.badgeIcon ?? ''} badge!`
            : `You earned ${challenge.xpReward} XP.`
        );
      }


      load();

    } catch (err) {

      console.error(
        'claimReward failed',
        err
      );

      Alert.alert(
        'Could not claim',
        (
          err as {
            message?: string;
          }
        )?.message ??
          'Please try again.'
      );
    }
  }


  /* =====================================================
     ADMIN SCREEN
  ===================================================== */

  if (isAdmin) {

    return (
      <AdminChallengesView
        challenges={challenges}
        loading={loading}
        error={error}
        insetsTop={insets.top}

        onCreate={() =>
          router.push(
            '/admin/challenges/new'
          )
        }

        onOpen={(challenge) =>
          router.push(
            `/admin/challenges/${challenge.id}`
          )
        }

        onDelete={async (
          challenge
        ) => {

          await deleteChallenge(
            challenge.id
          );

          load();
        }}
      />
    );
  }


  /* =====================================================
     USER SCREEN
  ===================================================== */

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


/* =========================================================
   ADMIN VIEW
========================================================= */

type AdminChallengesViewProps = {
  challenges: ChallengeWithStatus[];
  loading: boolean;
  error: string | null;
  insetsTop: number;
  onCreate: () => void;
  onOpen: (
    challenge: ChallengeWithStatus
  ) => void;
  onDelete: (
    challenge: ChallengeWithStatus
  ) => void;
};


function AdminChallengesView({
  challenges,
  loading,
  error,
  insetsTop,
  onCreate,
  onOpen,
  onDelete,
}: AdminChallengesViewProps) {


  function confirmDelete(
    challenge: ChallengeWithStatus
  ) {

    Alert.alert(
      'Delete challenge?',

      `"${challenge.title}" will be removed for everyone who joined it.`,

      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Delete',
          style: 'destructive',

          onPress: () =>
            onDelete(challenge),
        },
      ]
    );
  }


  return (
    <View style={styles.safe}>

      {/* Header */}

      <View
        style={[
          styles.header,
          {
            paddingTop:
              insetsTop + 8,
          },
        ]}
      >

        <Text style={styles.title}>
          Manage Challenges
        </Text>


        <TouchableOpacity
          style={[
            styles.iconBtn,
            styles.adminIconBtn,
          ]}
          onPress={onCreate}
        >

          <Ionicons
            name="add"
            size={22}
            color="#fff"
          />

        </TouchableOpacity>


      </View>


      {/* Content */}

      {loading ? (

        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#2563EB"
          />
        </View>

      ) : error ? (

        <View style={styles.center}>

          <Text
            style={styles.errorText}
          >
            {error}
          </Text>

        </View>

      ) : (

        <FlatList
          data={challenges}

          keyExtractor={(item) =>
            item.id
          }

          contentContainerStyle={
            styles.adminList
          }

          ListEmptyComponent={

            <View style={styles.center}>

              <Text
                style={styles.emptyText}
              >
                No challenges yet — tap +
                to create one
              </Text>

            </View>
          }

          renderItem={({ item }) => (

            <TouchableOpacity
              style={styles.adminCard}
              onPress={() =>
                onOpen(item)
              }
              activeOpacity={0.7}
            >

              <View
                style={
                  styles.adminCardHeader
                }
              >

                <Text
                  style={
                    styles.adminCardTitle
                  }
                >
                  {item.icon}{' '}
                  {item.title}
                </Text>


                <TouchableOpacity
                  onPress={() =>
                    confirmDelete(item)
                  }
                >

                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color="#DC2626"
                  />

                </TouchableOpacity>

              </View>


              <Text
                style={
                  styles.adminCardMeta
                }
              >
                {TYPE_LABEL[item.type]}
                {' · '}
                {item.goalValue.toLocaleString()}
                {' '}
                {item.goalUnit}
                {' · '}
                {item.xpReward} XP
              </Text>


              <Text
                style={
                  styles.adminCardDates
                }
              >
                {item.startDate}
                {' – '}
                {item.endDate}
              </Text>

            </TouchableOpacity>
          )}
        />

      )}

    </View>
  );
}


/* =========================================================
   USER VIEW
========================================================= */

type UserChallengesViewProps = {
  challenges: ChallengeWithStatus[];
  history: ChallengeHistoryEntry[];
  loading: boolean;
  error: string | null;
  insetsTop: number;
  userId: string | undefined;
  userName: string;
  onReload: () => void;
  onClaim: (
    challenge: ChallengeWithStatus
  ) => void;
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

  const router = useRouter();

  const { openChallengeId } =
    useLocalSearchParams<{ openChallengeId?: string }>();

  const friendRequestCount =
    useUserStore(
      (s) => s.friendRequestCount
    );

  const notificationCount =
    useUserStore(
      (s) => s.notificationCount
    );

  const setNotificationCount =
    useUserStore(
      (s) => s.setNotificationCount
    );

  const setSocialNotificationCount =
    useUserStore(
      (s) => s.setSocialNotificationCount
    );


  const [
    showNotifications,
    setShowNotifications,
  ] = useState(false);

  const [
    notifications,
    setNotifications,
  ] = useState<AppNotification[]>([]);

  const [
    loadingNotifications,
    setLoadingNotifications,
  ] = useState(false);


  const [
    statusFilter,
    setStatusFilter,
  ] = useState<FilterPill>('All');

  const [
    typeFilter,
    setTypeFilter,
  ] = useState<FilterPill>('All');

  const [
    highlightChallengeId,
    setHighlightChallengeId,
  ] = useState<string | null>(null);

  const listRef = useRef<FlatList<ChallengeWithStatus>>(null);

  // Each main panel has its own sub-panel set (or none, for "All"), so the previously
  // selected sub-panel isn't guaranteed to be valid after switching — e.g. leaving
  // "Pending" selected on 1v1 and switching to Team, which has no Pending sub-panel.
  function handleSelectMainFilter(main: FilterPill) {
    setTypeFilter(main);
    setStatusFilter(DEFAULT_SUB_FILTER[main] ?? 'All');
  }

  // Slides the active segment's highlight pill, same as the Daily/Weekly toggle on Home.
  const mainPillAnim = useRef(new Animated.Value(0)).current;
  const [mainTrackWidth, setMainTrackWidth] = useState(0);

  useEffect(() => {
    Animated.timing(mainPillAnim, {
      toValue: MAIN_FILTERS.indexOf(typeFilter),
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [typeFilter]);

  // Jumps the list to a specific challenge — used both when arriving here from a
  // "challenge complete" notification (via the openChallengeId route param) and when that
  // same notification is tapped while already on this screen (no navigation happens then,
  // so the param never changes). Resets both filter pills since a just-completed challenge
  // isn't guaranteed to match whatever filter the user had selected.
  function focusOnChallenge(challengeId: string) {
    setStatusFilter('All');
    setTypeFilter('All');
    setHighlightChallengeId(challengeId);
  }

  useEffect(() => {
    if (openChallengeId) focusOnChallenge(openChallengeId);
  }, [openChallengeId]);


  const [
    teamPickerChallenge,
    setTeamPickerChallenge,
  ] =
    useState<ChallengeWithStatus | null>(
      null
    );


  const [
    rosterChallenge,
    setRosterChallenge,
  ] =
    useState<ChallengeWithStatus | null>(
      null
    );


  const [
    opponentPickerChallenge,
    setOpponentPickerChallenge,
  ] =
    useState<ChallengeWithStatus | null>(
      null
    );


  const [
    teamInvitePickerChallenge,
    setTeamInvitePickerChallenge,
  ] =
    useState<ChallengeWithStatus | null>(
      null
    );


  /* =====================================================
     NOTIFICATIONS
  ===================================================== */

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;

      countUnreadNotifications(userId)
        .then(setNotificationCount)
        .catch(() => {});

      countUnreadNotifications(userId, SOCIAL_NOTIFICATION_TYPES)
        .then(setSocialNotificationCount)
        .catch(() => {});
    }, [
      userId,
      setNotificationCount,
      setSocialNotificationCount,
    ])
  );


  async function handleOpenNotifications() {
    if (!userId) return;

    setShowNotifications(true);
    setLoadingNotifications(true);

    try {
      const data =
        await fetchNotifications(userId);

      setNotifications(data);

      await markAllNotificationsRead(
        userId
      );

      setNotificationCount(0);
      setSocialNotificationCount(0);

    } catch (err) {

      console.error(
        'Failed to load notifications',
        err
      );

      setNotifications([]);

    } finally {

      setLoadingNotifications(false);
    }
  }


  function handleNotificationPress(
    notification: AppNotification
  ) {

    setShowNotifications(false);

    if (notificationLinksToChallenge(notification.type) && notification.challengeId) {
      // Already on this screen, so there's no route param to trigger the effect —
      // jump to the challenge directly instead of navigating.
      focusOnChallenge(notification.challengeId);
      return;
    }

    if (!notification.postId) {
      return;
    }

    router.push(
      `/post/${notification.postId}`
    );
  }


  /* =====================================================
     PENDING COUNT
  ===================================================== */

  // Team and 1v1 each have their own "Pending" sub-panel — count only within whichever
  // main panel is currently selected, so the badge matches what that pill will show.
  const pendingCount =
    useMemo(
      () =>
        challenges.filter(
          (c) =>
            c.type === typeFilter.toLowerCase() &&
            c.participation
              ?.status === 'pending'
        ).length,

      [challenges, typeFilter]
    );


  /* =====================================================
     FILTERED LIST
  ===================================================== */

  const listData =
    useMemo(
      () =>
        challenges
          .filter(
            (c) =>
              matchesFilter(
                c,
                typeFilter,
                statusFilter
              )
          )
          // Claimable rewards float to the top, fully claimed ones sink to the bottom —
          // sort is stable, so everything else keeps its existing relative order.
          .sort((a, b) =>
            challengeSortRank(a) - challengeSortRank(b)
          ),

      [
        challenges,
        statusFilter,
        typeFilter,
      ]
    );

  useEffect(() => {
    if (!highlightChallengeId) return;

    const index = listData.findIndex((c) => c.id === highlightChallengeId);
    if (index === -1) return;

    const scrollTimer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
    }, 150);

    const clearTimer = setTimeout(() => setHighlightChallengeId(null), 2500);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightChallengeId, listData]);


  /* =====================================================
     JOIN TEAM
  ===================================================== */

  async function handleJoinTeam(
    teamId: string
  ) {

    if (
      !userId ||
      !teamPickerChallenge
    ) {
      return;
    }


    try {

      await joinTeam(
        userId,
        teamPickerChallenge.id,
        teamId
      );


      setTeamPickerChallenge(
        null
      );


      onReload();

    } catch (err) {

      console.error(
        'joinTeam failed',
        err
      );

      Alert.alert(
        'Could not join team',
        (
          err as {
            message?: string;
          }
        )?.message ??
          'Please try again.'
      );
    }
  }


  /* =====================================================
     CREATE TEAM
  ===================================================== */

  async function handleCreateTeam(
    name: string
  ) {

    if (
      !userId ||
      !teamPickerChallenge
    ) {
      return;
    }


    try {

      await createTeam(
        userId,
        teamPickerChallenge.id,
        name,
        teamPickerChallenge.durationDays
      );


      setTeamPickerChallenge(
        null
      );


      onReload();

    } catch (err) {

      console.error(
        'createTeam failed',
        err
      );

      Alert.alert(
        'Could not create team',
        (
          err as {
            message?: string;
          }
        )?.message ??
          'Please try again.'
      );
    }
  }


  /* =====================================================
     INVITE OPPONENT
  ===================================================== */

  async function handleInvite(
    opponentId: string
  ) {

    if (
      !userId ||
      !opponentPickerChallenge
    ) {
      return;
    }


    try {

      await inviteOpponent(
        userId,
        opponentPickerChallenge.id,
        opponentId
      );


      setOpponentPickerChallenge(
        null
      );


      onReload();

    } catch (err) {

      console.error(
        'inviteOpponent failed',
        err
      );

      Alert.alert(
        'Could not invite',
        (
          err as {
            message?: string;
          }
        )?.message ??
          'Please try again.'
      );
    }
  }


  /* =====================================================
     INVITE TO TEAM
  ===================================================== */

  async function handleInviteToTeam(
    inviteeId: string
  ) {

    if (
      !userId ||
      !teamInvitePickerChallenge
        ?.participation?.teamId
    ) {
      return;
    }


    try {

      await inviteToTeam(
        userId,
        teamInvitePickerChallenge.id,
        teamInvitePickerChallenge
          .participation
          .teamId,
        inviteeId
      );


      setTeamInvitePickerChallenge(
        null
      );


      onReload();

    } catch (err) {

      console.error(
        'inviteToTeam failed',
        err
      );

      Alert.alert(
        'Could not invite',
        (
          err as {
            message?: string;
          }
        )?.message ??
          'Please try again.'
      );
    }
  }


  /* =====================================================
     RESPOND TO INVITE
  ===================================================== */

  async function handleRespondToInvite(
    challenge: ChallengeWithStatus,
    accept: boolean
  ) {

    if (!challenge.participation) {
      return;
    }


    try {

      await respondToInvite(
        challenge.participation.id,
        accept
      );


      if (
        accept &&
        userId
      ) {

        await refreshStatsBasedProgress(
          userId
        );
      }


      onReload();

    } catch (err) {

      console.error(
        'respondToInvite failed',
        err
      );

      Alert.alert(
        'Something went wrong',
        (
          err as {
            message?: string;
          }
        )?.message ??
          'Please try again.'
      );
    }
  }


  /* =====================================================
     CANCEL INVITE
  ===================================================== */

  async function handleCancelInvite(
    challenge: ChallengeWithStatus
  ) {

    if (
      !userId ||
      !challenge.opponent
    ) {
      return;
    }


    try {

      await cancelInvite(
        challenge.id,
        userId,
        challenge.opponent.userId
      );


      onReload();

    } catch (err) {

      console.error(
        'cancelInvite failed',
        err
      );

      Alert.alert(
        'Could not cancel',
        (
          err as {
            message?: string;
          }
        )?.message ??
          'Please try again.'
      );
    }
  }


  /* =====================================================
     TEAM ROSTER
  ===================================================== */

  const myRosterTeam =
    rosterChallenge?.teams.find(
      (t) =>
        t.id ===
        rosterChallenge
          .participation
          ?.teamId
    );


  /* =====================================================
     USER UI
  ===================================================== */

  return (
    <View style={styles.safe}>

      {/* =================================================
          HEADER
      ================================================= */}

      <View
        style={[
          styles.header,
          {
            paddingTop:
              insetsTop + 8,
          },
        ]}
      >

        <Text style={styles.title}>
          Challenges
        </Text>


        <View
          style={styles.headerIcons}
        >

          {/* Add Friend */}

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              router.push('/friends')
            }
            activeOpacity={0.7}
          >

            <Ionicons
              name="person-add-outline"
              size={20}
              color="#1B2B4B"
            />


            {friendRequestCount > 0 && (

              <View
                style={styles.notifBadge}
              >

                <Text
                  style={
                    styles.notifBadgeText
                  }
                >
                  {friendRequestCount > 9
                    ? '9+'
                    : friendRequestCount}
                </Text>

              </View>

            )}

          </TouchableOpacity>


          {/* Messages */}

          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.7}
          >

            <Ionicons
              name="chatbubble-outline"
              size={20}
              color="#1B2B4B"
            />

          </TouchableOpacity>


          {/* Notifications */}

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={
              handleOpenNotifications
            }
            activeOpacity={0.7}
          >

            <Ionicons
              name="notifications-outline"
              size={20}
              color="#1B2B4B"
            />


            {notificationCount > 0 && (

              <View
                style={styles.notifBadge}
              >

                <Text
                  style={
                    styles.notifBadgeText
                  }
                >
                  {notificationCount > 9
                    ? '9+'
                    : notificationCount}
                </Text>

              </View>

            )}

          </TouchableOpacity>

        </View>

      </View>


      {/* =================================================
          FILTER MENU
      ================================================= */}

      <View
        style={styles.filterContainer}
      >

        {/* ---------------------------------------------
            MAIN PANEL
            All / Team / Individual / 1v1 — an evenly
            split segmented control, the primary switch.
        --------------------------------------------- */}

        <View
          style={styles.mainSegmentRow}
          onLayout={(e) =>
            setMainTrackWidth(
              e.nativeEvent.layout.width
            )
          }
        >

          <Animated.View
            style={[
              styles.mainSegmentPill,
              {
                transform: [
                  {
                    translateX:
                      mainPillAnim.interpolate({
                        inputRange: MAIN_FILTERS.map(
                          (_, i) => i
                        ),
                        outputRange: MAIN_FILTERS.map(
                          (_, i) =>
                            (i * mainTrackWidth) /
                            MAIN_FILTERS.length
                        ),
                      }),
                  },
                ],
              },
            ]}
          />

          {MAIN_FILTERS.map(
            (f) => (

              <TouchableOpacity
                key={f}
                style={styles.mainSegment}
                onPress={() =>
                  handleSelectMainFilter(f)
                }
                activeOpacity={0.8}
              >

                <Text
                  style={[
                    styles.mainSegmentText,
                    typeFilter === f &&
                      styles.mainSegmentTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {f}
                </Text>

              </TouchableOpacity>

            )
          )}

        </View>


        {/* ---------------------------------------------
            SUB PANEL
            Lightweight underline tabs — visually secondary
            to the segmented control above. Depends on the
            selected main panel; hidden entirely under
            "All", which has no sub-panels.
        --------------------------------------------- */}

        {SUB_FILTERS[typeFilter] && (

          <View style={styles.subTabRow}>

            {SUB_FILTERS[typeFilter]!.map(
              (f) => (

                <TouchableOpacity
                  key={f}
                  style={[
                    styles.subTab,
                    statusFilter === f &&
                      styles.subTabActive,
                  ]}
                  onPress={() =>
                    setStatusFilter(f)
                  }
                  activeOpacity={0.7}
                >

                  <Text
                    style={[
                      styles.subTabText,
                      statusFilter === f &&
                        styles.subTabTextActive,
                    ]}
                  >
                    {f === 'Completed'
                      ? 'Complete'
                      : f}
                  </Text>


                  {/* Pending notification */}

                  {f === 'Pending' &&
                    pendingCount > 0 && (

                      <View
                        style={
                          styles.subTabBadge
                        }
                      >

                        <Text
                          style={
                            styles.subTabBadgeText
                          }
                        >
                          {pendingCount}
                        </Text>

                      </View>

                    )}

                </TouchableOpacity>

              )
            )}

          </View>

        )}

      </View>


      {/* =================================================
          LOADING / ERROR / LIST
      ================================================= */}

      {loading ? (

        <View style={styles.center}>

          <ActivityIndicator
            size="large"
            color="#2563EB"
          />

        </View>

      ) : error ? (

        <View style={styles.center}>

          <Text
            style={styles.errorText}
          >
            {error}
          </Text>

        </View>

      ) : (

        <FlatList
          ref={listRef}

          data={listData}

          keyExtractor={(item) =>
            item.id
          }

          contentContainerStyle={
            styles.list
          }

          onScrollToIndexFailed={(info: { index: number; averageItemLength: number }) => {
            listRef.current?.scrollToOffset({
              offset: info.index * info.averageItemLength,
              animated: true,
            });
          }}


          /* -------------------------------------------
             EMPTY STATE
          ------------------------------------------- */

          ListEmptyComponent={

            statusFilter === 'Completed' &&
            history.length > 0 ? null : (

              <View style={styles.center}>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  No challenges match
                  this filter
                </Text>

              </View>

            )
          }


          /* -------------------------------------------
             CHALLENGE CARDS
          ------------------------------------------- */

          renderItem={({ item }) =>

            item.type === '1v1' ? (

              <HeadToHeadCard
                challenge={item}

                myName={
                  userName
                }

                onInvite={() =>
                  setOpponentPickerChallenge(
                    item
                  )
                }

                onAccept={() =>
                  handleRespondToInvite(
                    item,
                    true
                  )
                }

                onDecline={() =>
                  handleRespondToInvite(
                    item,
                    false
                  )
                }

                onCancel={() =>
                  handleCancelInvite(
                    item
                  )
                }

                onClaim={() =>
                  onClaim(item)
                }

                onPlayAgain={() =>
                  setOpponentPickerChallenge(
                    item
                  )
                }
              />

            ) : (

              <ChallengeCard
                challenge={item}

                onOpenTeamPicker={() =>
                  setTeamPickerChallenge(
                    item
                  )
                }

                onViewTeam={() =>
                  setRosterChallenge(
                    item
                  )
                }

                onInviteFriend={() =>
                  setTeamInvitePickerChallenge(
                    item
                  )
                }

                onClaim={() =>
                  onClaim(item)
                }

                onAcceptTeamInvite={() =>
                  handleRespondToInvite(
                    item,
                    true
                  )
                }

                onDeclineTeamInvite={() =>
                  handleRespondToInvite(
                    item,
                    false
                  )
                }

                highlighted={item.id === highlightChallengeId}
              />

            )
          }


          /* -------------------------------------------
             COMPLETED HISTORY
          ------------------------------------------- */

          ListFooterComponent={

            statusFilter === 'Completed' &&
            history.length > 0 ? (

              <>

                {history.map(
                  (entry) => (

                    <ChallengeHistoryCard
                      key={entry.id}
                      entry={entry}
                    />

                  )
                )}

              </>

            ) : null
          }

        />

      )}


      {/* =================================================
          TEAM JOIN MODAL
      ================================================= */}

      <TeamJoinModal
        visible={
          !!teamPickerChallenge
        }

        teams={
          teamPickerChallenge
            ?.teams ?? []
        }

        goalValue={
          teamPickerChallenge
            ?.goalValue ?? 0
        }

        goalUnit={
          teamPickerChallenge
            ?.goalUnit ?? ''
        }

        onClose={() =>
          setTeamPickerChallenge(
            null
          )
        }

        onJoinTeam={
          handleJoinTeam
        }

        onCreateTeam={
          handleCreateTeam
        }
      />


      {/* =================================================
          TEAM ROSTER MODAL
      ================================================= */}

      <TeamRosterModal
        visible={
          !!rosterChallenge
        }

        teamName={
          myRosterTeam?.name ?? ''
        }

        goalUnit={
          rosterChallenge
            ?.goalUnit ?? ''
        }

        goalValue={
          rosterChallenge
            ?.goalValue ?? 0
        }

        expiresAt={
          myRosterTeam
            ?.expiresAt ?? null
        }

        members={
          myRosterTeam
            ?.members ?? []
        }

        currentUserId={
          userId
        }

        onClose={() =>
          setRosterChallenge(
            null
          )
        }
      />


      {/* =================================================
          OPPONENT PICKER
      ================================================= */}

      {userId && (

        <OpponentPickerModal
          visible={
            !!opponentPickerChallenge
          }

          currentUserId={
            userId
          }

          title="Invite an Opponent"

          friendsOnly

          onClose={() =>
            setOpponentPickerChallenge(
              null
            )
          }

          onInvite={
            handleInvite
          }
        />

      )}


      {/* =================================================
          TEAM INVITE PICKER
      ================================================= */}

      {userId && (

        <OpponentPickerModal
          visible={
            !!teamInvitePickerChallenge
          }

          currentUserId={
            userId
          }

          title="Invite a Friend"

          friendsOnly

          onClose={() =>
            setTeamInvitePickerChallenge(
              null
            )
          }

          onInvite={
            handleInviteToTeam
          }
        />

      )}


      {/* =================================================
          NOTIFICATIONS
      ================================================= */}

      <NotificationsModal
        visible={
          showNotifications
        }
        notifications={
          notifications
        }
        loading={
          loadingNotifications
        }
        onClose={() =>
          setShowNotifications(false)
        }
        onPressNotification={
          handleNotificationPress
        }
      />

    </View>
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    safe: {
      flex: 1,
      backgroundColor:
        '#F0F4F8',
    },


    /* -----------------------------------------------
       HEADER
    ----------------------------------------------- */

    header: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',

      paddingHorizontal:
        20,

      paddingBottom:
        12,
    },


    title: {
      fontSize: 26,
      fontWeight: '800',
      color: '#0D1829',
      letterSpacing: -0.3,
    },


    headerIcons: {
      flexDirection:
        'row',

      gap: 8,
    },


    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,

      backgroundColor:
        '#FFFFFF',

      alignItems:
        'center',

      justifyContent:
        'center',

      shadowColor:
        '#000',

      shadowOffset: {
        width: 0,
        height: 1,
      },

      shadowOpacity:
        0.08,

      shadowRadius:
        4,

      elevation: 2,
    },


    adminIconBtn: {
      backgroundColor:
        '#1B2B4B',
    },


    /* -----------------------------------------------
       NOTIFICATION BADGE
    ----------------------------------------------- */

    notifBadge: {
      position:
        'absolute',

      top: -2,
      right: -2,

      minWidth: 16,
      height: 16,

      borderRadius: 8,

      backgroundColor:
        '#DC2626',

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        3,
    },


    notifBadgeText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '800',
    },


    /* -----------------------------------------------
       TWO ROW FILTER MENU
    ----------------------------------------------- */

    filterContainer: {
      marginBottom:
        12,
    },


    // Primary switch — an evenly split segmented control, styled to read as one control
    // rather than a row of separate buttons like the sub-panel below it. The active
    // segment is a single sliding pill (mainSegmentPill) rather than a per-button
    // background, so switching panels animates like the Home tab's Daily/Weekly toggle.
    mainSegmentRow: {
      flexDirection:
        'row',

      backgroundColor:
        '#E9EEF5',

      borderRadius: 12,

      padding: 3,

      marginHorizontal:
        16,

      position:
        'relative',
    },


    mainSegmentPill: {
      position:
        'absolute',

      top: 3,
      left: 3,
      bottom: 3,

      width: '25%',

      backgroundColor:
        '#FFFFFF',

      borderRadius: 9,

      shadowColor:
        '#000',

      shadowOffset: {
        width: 0,
        height: 1,
      },

      shadowOpacity:
        0.08,

      shadowRadius: 3,

      elevation: 1,
    },


    mainSegment: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingVertical:
        8,

      zIndex: 1,
    },


    mainSegmentText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#6B7280',
    },


    mainSegmentTextActive: {
      color: '#1B2B4B',
    },


    // Sub panel — smaller, lighter pills than the segmented control above, so the two
    // rows don't compete for attention but still share the same shape language.
    subTabRow: {
      flexDirection:
        'row',

      gap: 8,

      paddingHorizontal:
        16,

      paddingTop: 10,

      paddingBottom: 4,
    },


    // Inactive shape matches the Social tab's activity-feed filter pills — white fill,
    // thin border, fully rounded — rather than a flat gray chip.
    subTab: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 6,

      paddingHorizontal:
        12,

      paddingVertical:
        6,

      borderRadius:
        20,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E2E8F0',
    },


    subTabActive: {
      backgroundColor:
        '#1B2B4B',

      borderColor:
        '#1B2B4B',
    },


    subTabText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#6B7280',
    },


    subTabTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },


    subTabBadge: {
      minWidth: 16,
      height: 16,

      borderRadius: 8,

      paddingHorizontal:
        4,

      backgroundColor:
        '#DC2626',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    subTabBadgeText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 9,
    },


    /* -----------------------------------------------
       GENERAL
    ----------------------------------------------- */

    center: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingVertical:
        60,
    },


    emptyText: {
      color:
        '#9CA3AF',

      fontSize:
        14,

      fontWeight:
        '600',
    },


    errorText: {
      color:
        '#DC2626',

      fontSize:
        14,

      fontWeight:
        '600',

      textAlign:
        'center',

      paddingHorizontal:
        32,
    },


    list: {
      paddingBottom:
        100,
    },


    /* -----------------------------------------------
       ADMIN
    ----------------------------------------------- */

    adminList: {
      paddingHorizontal:
        16,

      paddingBottom:
        100,
    },


    adminCard: {
      backgroundColor:
        '#FFFFFF',

      borderRadius:
        16,

      padding:
        16,

      marginBottom:
        12,

      shadowColor:
        '#000',

      shadowOffset: {
        width: 0,
        height: 1,
      },

      shadowOpacity:
        0.05,

      shadowRadius:
        4,

      elevation: 2,
    },


    adminCardHeader: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',
    },


    adminCardTitle: {
      fontSize:
        15,

      fontWeight:
        '700',

      color:
        '#0D1829',
    },


    adminCardMeta: {
      fontSize:
        12,

      color:
        '#6B7280',

      marginTop:
        6,

      fontWeight:
        '600',
    },


    adminCardDates: {
      fontSize:
        11,

      color:
        '#9CA3AF',

      marginTop:
        4,
    },

  });