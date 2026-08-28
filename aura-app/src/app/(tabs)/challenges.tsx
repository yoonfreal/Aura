import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
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

const STATUS_FILTERS: FilterPill[] = [
  'All',
  'Ongoing',
  'Pending',
  'Completed',
];

const TYPE_FILTERS: FilterPill[] = [
  'All',
  'Team',
  'Individual',
  '1v1',
];


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
  statusFilter: FilterPill,
  typeFilter: FilterPill
): boolean {
  const category =
    c.category?.toLowerCase() ?? '';

  const isPendingInvite =
    c.participation?.status === 'pending';

  const isDone =
    !!c.participation?.claimed;

  const isExpired =
    isChallengeExpired(c);

  /*
   * -------------------------------
   * STATUS FILTER
   * -------------------------------
   */

  if (statusFilter === 'Completed') {
    if (!isDone) {
      return false;
    }
  }

  if (statusFilter === 'Pending') {
    if (!isPendingInvite) {
      return false;
    }
  }

  if (statusFilter === 'Ongoing') {
    /*
     * A challenge is ongoing when:
     * - user has joined
     * - invitation is not pending
     * - reward has not been claimed
     * - challenge has not expired
     */
    if (
      !c.participation ||
      isPendingInvite ||
      isDone ||
      isExpired
    ) {
      return false;
    }
  }

  /*
   * -------------------------------
   * TYPE FILTER
   * -------------------------------
   *
   * "All" means don't filter by type.
   */

  if (
    typeFilter !== 'All' &&
    c.type !== typeFilter.toLowerCase()
  ) {
    return false;
  }

  /*
   * Both filters passed.
   */

  return true;
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
    }, [
      userId,
      setNotificationCount,
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

  const pendingCount =
    useMemo(
      () =>
        challenges.filter(
          (c) =>
            c.participation
              ?.status === 'pending'
        ).length,

      [challenges]
    );


  /* =====================================================
     FILTERED LIST
  ===================================================== */

  const listData =
    useMemo(
      () =>
        challenges.filter(
          (c) =>
            matchesFilter(
              c,
              statusFilter,
              typeFilter
            )
        ),

      [
        challenges,
        statusFilter,
        typeFilter,
      ]
    );


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
          TWO-ROW FILTER MENU
      ================================================= */}

      <View
        style={styles.filterContainer}
      >

        {/* ---------------------------------------------
            TOP ROW
            All / Ongoing / Pending / Complete
        --------------------------------------------- */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterRow
          }
        >

          {STATUS_FILTERS.map(
            (f) => (

              <TouchableOpacity
                key={f}
                style={[
                  styles.pill,
                  statusFilter === f &&
                    styles.pillActive,
                ]}
                onPress={() =>
                  setStatusFilter(f)
                }
                activeOpacity={0.8}
              >

                <Text
                  style={[
                    styles.pillText,
                    statusFilter === f &&
                      styles.pillTextActive,
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
                        styles.pillBadge
                      }
                    >

                      <Text
                        style={
                          styles.pillBadgeText
                        }
                      >
                        {pendingCount}
                      </Text>

                    </View>

                  )}

              </TouchableOpacity>

            )
          )}

        </ScrollView>


        {/* ---------------------------------------------
            BOTTOM ROW
            All / Team / Individual / 1v1
        --------------------------------------------- */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterRow
          }
        >

          {TYPE_FILTERS.map(
            (f) => (

              <TouchableOpacity
                key={f}
                style={[
                  styles.pill,
                  typeFilter === f &&
                    styles.pillActive,
                ]}
                onPress={() =>
                  setTypeFilter(f)
                }
                activeOpacity={0.8}
              >

                <Text
                  style={[
                    styles.pillText,
                    typeFilter === f &&
                      styles.pillTextActive,
                  ]}
                >
                  {f}
                </Text>

              </TouchableOpacity>

            )
          )}

        </ScrollView>

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
          data={listData}

          keyExtractor={(item) =>
            item.id
          }

          contentContainerStyle={
            styles.list
          }


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


    filterRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 8,

      paddingHorizontal:
        16,

      paddingVertical:
        4,
    },


    pill: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 6,

      paddingHorizontal:
        16,

      paddingVertical:
        8,

      borderRadius:
        20,

      backgroundColor:
        '#FFFFFF',
    },


    pillActive: {
      backgroundColor:
        '#1B2B4B',
    },


    pillText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#6B7280',
    },


    pillTextActive: {
      color: '#FFFFFF',
    },


    pillBadge: {
      minWidth: 18,
      height: 18,

      borderRadius: 9,

      paddingHorizontal:
        4,

      backgroundColor:
        '#DC2626',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    pillBadgeText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 10,
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