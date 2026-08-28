import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useUserStore } from '@/store/userStore';
import { StatCard } from '@/components/StatCard';
import { MissionCard } from '@/components/MissionCard';
import { XPBar } from '@/components/XPBar';
import { WatchSyncCard } from '@/components/WatchSyncCard';
import { GymCheckInIcon } from '@/components/GymCheckInIcon';
import { WeeklyView } from '@/components/WeeklyView';
import { NotificationsModal } from '@/components/NotificationsModal';

import { fetchWatchSyncStatus } from '@/lib/healthkit';

import {
  fetchTodayMissions,
  fetchDailyStats,
  logMissionComplete,
  fetchWeeklyStats,
  incrementDailyStat,
} from '@/lib/api';

import {
  syncChallengeProgressForUser,
  refreshClaimableCount,
} from '@/lib/challenges';

import { countIncomingRequests } from '@/lib/friends';

import {
  countUnreadNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from '@/lib/notifications';

import { getLevelTitle, xpForLevel } from '@/lib/level';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    user,
    dailyStats,
    missions,
    watchSync,
    activeTab,
    weeklyStats,
    friendRequestCount,

    setActiveTab,
    setDailyStats,
    setWatchSync,
    setMissions,
    setUser,
    setWeeklyStats,
    setClaimableCount,
    setFriendRequestCount,
    setNotificationCount,
  } = useUserStore();

  const pillAnim = useRef(new Animated.Value(0)).current;

  const [trackWidth, setTrackWidth] = useState(0);

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const unreadNotifications = useUserStore(
    (state) => state.notificationCount
  );

  useEffect(() => {
    Animated.timing(pillAnim, {
      toValue: activeTab === 'Daily' ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      if (!user || activeTab !== 'Weekly') return;

      fetchWeeklyStats(user.id)
        .then(setWeeklyStats)
        .catch((err) =>
          console.error('fetchWeeklyStats failed', err)
        );
    }, [user?.id, activeTab]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!user) return;

      async function loadData() {
        try {
          const [
            activityStats,
            sync,
            todayMissions,
          ] = await Promise.all([
            fetchDailyStats(user!.id),
            fetchWatchSyncStatus(),
            fetchTodayMissions(user!.id),
          ]);

          setDailyStats({
            steps: activityStats.steps,
            calories: activityStats.calories,
            streakDays: user!.streak,
            xpEarned: activityStats.xpEarned,
          });

          setMissions(todayMissions);
          setWatchSync(sync);

          const claimable = await refreshClaimableCount(
            user!.id
          );

          setClaimableCount(claimable);

          const friendRequests =
            await countIncomingRequests(user!.id);

          setFriendRequestCount(friendRequests);

          const unreadNotifications =
            await countUnreadNotifications(user!.id);

          setNotificationCount(unreadNotifications);
        } catch (err) {
          console.error('loadData failed', err);
        }
      }

      loadData();
    }, [user?.id]),
  );

  async function handleOpenNotifications() {
    if (!user) return;

    setShowNotifications(true);
    setLoadingNotifications(true);

    try {
      const data = await fetchNotifications(user.id);

      setNotifications(data);

      await markAllNotificationsRead(user.id);

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

    if (!notification.postId) return;

    router.push(`/post/${notification.postId}`);
  }

  async function handleLog(userMissionId: string) {
    if (!user) return;

    const mission = missions.find(
      (m) => m.id === userMissionId
    );

    if (!mission) return;

    try {
      const {
        newXp,
        newLevel,
        newStreak,
      } = await logMissionComplete(
        userMissionId,
        user.id,
        mission.goalValue,
        mission.xpReward,
        user.xp,
        user.level,
      );

      await syncChallengeProgressForUser(
        user.id,
        mission.goalUnit,
        mission.goalValue
      );

      setMissions(
        missions.map((m) =>
          m.id === userMissionId
            ? {
                ...m,
                currentValue: m.goalValue,
                completed: true,
              }
            : m,
        ),
      );

      setUser({
        ...user,
        xp: newXp,
        level: newLevel,
        xpForNextLevel: xpForLevel(
          newLevel + 1
        ),
        streak: newStreak,
      });

      if (
        mission.goalUnit === 'steps' ||
        mission.goalUnit === 'calories'
      ) {
        const {
          steps,
          calories,
        } = await incrementDailyStat(
          user.id,
          mission.goalUnit,
          mission.goalValue
        );

        setDailyStats({
          ...dailyStats,
          steps,
          calories,
          streakDays: newStreak,
          xpEarned:
            dailyStats.xpEarned +
            mission.xpReward,
        });
      } else {
        setDailyStats({
          ...dailyStats,
          streakDays: newStreak,
          xpEarned:
            dailyStats.xpEarned +
            mission.xpReward,
        });
      }

      const claimable =
        await refreshClaimableCount(user.id);

      setClaimableCount(claimable);
    } catch (err) {
      console.error('handleLog failed', err);

      Alert.alert(
        'Could not log mission',
        (err as { message?: string })
          ?.message ??
          'Please try again.'
      );
    }
  }

  if (!user) return null;

  return (
    <View style={styles.safe}>
      {/* Sticky header */}
      <View
        style={[
          styles.stickyHeader,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.username}>
            {user.username}
          </Text>

          <View style={styles.headerIcons}>
            {/* Gym Check-In */}
            <GymCheckInIcon userId={user.id} />

            {/* Friend Requests */}
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
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
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
              onPress={() => {
                // Keep your existing chat behavior here
              }}
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
              onPress={handleOpenNotifications}
              activeOpacity={0.7}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#1B2B4B"
              />

              {unreadNotifications > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadNotifications > 9
                      ? '9+'
                      : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Level Badge */}
        <View style={styles.levelSection}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>
              ⭐ Level {user.level} (
              {getLevelTitle(user.level)})
            </Text>

            <Text style={styles.xpText}>
              {user.xp.toLocaleString()} /{' '}
              {user.xpForNextLevel.toLocaleString()} XP
            </Text>
          </View>

          <View style={styles.xpBarWrap}>
            <XPBar
              current={user.xp}
              max={user.xpForNextLevel}
            />
          </View>
        </View>

        {/* Daily / Weekly Tabs */}
        <View style={styles.segmentWrapper}>
          <View
            style={styles.segmentTrack}
            onLayout={(e) =>
              setTrackWidth(
                e.nativeEvent.layout.width
              )
            }
          >
            <Animated.View
              style={[
                styles.segmentPill,
                {
                  transform: [
                    {
                      translateX:
                        pillAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [
                            0,
                            trackWidth / 2,
                          ],
                        }),
                    },
                  ],
                },
              ]}
            />

            {(['Daily', 'Weekly'] as const).map(
              (tab) => (
                <TouchableOpacity
                  key={tab}
                  style={styles.segmentBtn}
                  onPress={() =>
                    setActiveTab(tab)
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      activeTab === tab &&
                        styles.segmentTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {activeTab === 'Daily' ? (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <StatCard
                  icon="footsteps"
                  iconColor="#0D9488"
                  iconBg="#CCFBF1"
                  value={dailyStats.steps.toLocaleString()}
                  label="Avg daily steps"
                />

                <StatCard
                  icon="barbell"
                  iconColor="#EA580C"
                  iconBg="#FFEDD5"
                  value={dailyStats.calories.toString()}
                  label="Calories"
                />
              </View>

              <View style={styles.statsRow}>
                <StatCard
                  icon="flame"
                  iconColor="#DC2626"
                  iconBg="#FEE2E2"
                  value={dailyStats.streakDays.toString()}
                  label="Days streak"
                />

                <StatCard
                  icon="trophy"
                  iconColor="#D97706"
                  iconBg="#FEF3C7"
                  value={dailyStats.xpEarned.toString()}
                  label="XP earned"
                />
              </View>
            </View>

            {/* Watch Sync */}
            <WatchSyncCard
              status={watchSync}
            />

            {/* Missions */}
            <Text style={styles.sectionTitle}>
              TODAY'S MISSIONS
            </Text>

            {missions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onLog={handleLog}
              />
            ))}
          </>
        ) : (
          <WeeklyView stats={weeklyStats} />
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Notifications Popup */}
      <NotificationsModal
        visible={showNotifications}
        notifications={notifications}
        loading={loadingNotifications}
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F2F6F9',
  },

  stickyHeader: {
    backgroundColor: '#F2F6F9',
    paddingBottom: 8,
  },

  scroll: {
    flex: 1,
    backgroundColor: '#F2F6F9',
  },

  content: {
    paddingBottom: 120,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },

  username: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1B2B4B',
    letterSpacing: -0.5,
  },

  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },

  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },

  notifBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // Level
  levelSection: {
    marginHorizontal: 16,
    marginBottom: 8,
  },

  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1B2B4B',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 10,
  },

  levelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  xpText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5B800',
  },

  xpBarWrap: {
    marginHorizontal: 4,
  },

  // Segment control
  segmentWrapper: {
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
  },

  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#E8EDF2',
    borderRadius: 12,
    padding: 3,
    position: 'relative',
  },

  segmentPill: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    width: '50%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    zIndex: 1,
  },

  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  segmentTextActive: {
    color: '#1B2B4B',
    fontWeight: '700',
  },

  // Stats grid
  statsGrid: {
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 10,
    gap: 6,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 0,
  },

  // Section
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 14,
  },

  bottomPad: {
    height: 16,
  },

  comingSoon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 10,
  },

  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9CA3AF',
  },

  comingSoonSub: {
    fontSize: 13,
    color: '#C4C9D4',
    fontWeight: '500',
  },
});