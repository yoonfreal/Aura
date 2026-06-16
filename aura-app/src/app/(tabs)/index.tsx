import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';

import { useUserStore } from '@/store/userStore';
import { StatCard } from '@/components/StatCard';
import { MissionCard } from '@/components/MissionCard';
import { XPBar } from '@/components/XPBar';
import { WatchSyncCard } from '@/components/WatchSyncCard';
import { fetchTodayStats, fetchWatchSyncStatus } from '@/lib/healthkit';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, dailyStats, missions, watchSync, activeTab, setActiveTab, setDailyStats, setWatchSync } =
    useUserStore();

  useEffect(() => {
    async function loadData() {
      const [stats, sync] = await Promise.all([
        fetchTodayStats(),
        fetchWatchSyncStatus(),
      ]);
      setDailyStats(stats);
      setWatchSync(sync);
    }
    loadData();
  }, []);

  if (!user) return null;

  return (
    <View style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.username}>{user.username}</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn}>
              <Text style={styles.headerIconText}>👤+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Text style={styles.headerIconText}>💬</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Level Badge */}
        <View style={styles.levelSection}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>⭐ Level {user.level} (Warrior)</Text>
            <Text style={styles.xpText}>
              {user.xp.toLocaleString()} / {user.xpForNextLevel.toLocaleString()} XP
            </Text>
          </View>
          <View style={styles.xpBarWrap}>
            <XPBar current={user.xp} max={user.xpForNextLevel} />
          </View>
        </View>

        {/* Daily / Weekly Tabs */}
        <View style={styles.tabRow}>
          {(['Daily', 'Weekly'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={styles.tab}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
          <View style={styles.tabDivider} />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              icon="🦶"
              value={dailyStats.steps.toLocaleString()}
              label="Avg daily steps"
              iconBg="#D1FAE5"
            />
            <StatCard
              icon="💪"
              value={dailyStats.calories.toString()}
              label="Calories"
              iconBg="#D1FAE5"
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              icon="🔥"
              value={dailyStats.streakDays.toString()}
              label="Days streak"
              iconBg="#FEF3C7"
            />
            <StatCard
              icon="🏆"
              value={dailyStats.xpEarned.toString()}
              label="XP earned"
              iconBg="#FEF3C7"
            />
          </View>
        </View>

        {/* Watch Sync */}
        <WatchSyncCard status={watchSync} />

        {/* Missions */}
        <Text style={styles.sectionTitle}>TODAY'S MISSIONS</Text>
        {missions.map((mission) => (
          <MissionCard key={mission.id} mission={mission} />
        ))}

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F2F6F9',
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
  headerIconText: {
    fontSize: 16,
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

  // Tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    position: 'relative',
  },
  tabDivider: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  tab: {
    marginRight: 24,
    paddingBottom: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  tabTextActive: {
    fontWeight: '700',
    color: '#1B2B4B',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#1B2B4B',
    borderRadius: 1,
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
});
