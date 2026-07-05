import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { getLevelTitle } from '@/lib/level';

type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  level: number;
  xp: number;
};

type TabType = 'Overall' | 'Weekly' | 'Friends';

const AVATAR_COLORS = [
  '#1E4D8C', '#4A5568', '#744210', '#065F46',
  '#5B21B6', '#831843', '#1E3A5F', '#3D2B1F',
];

function getAvatarColor(rankIndex: number): string {
  return AVATAR_COLORS[rankIndex % AVATAR_COLORS.length];
}

function formatXP(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
  return xp.toLocaleString();
}

function getMondayDate(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

const PODIUM_CONFIG = {
  1: { ringColor: '#F5B800', avatarSize: 66, barHeight: 96 },
  2: { ringColor: '#9BA4B4', avatarSize: 54, barHeight: 68 },
  3: { ringColor: '#CD7F32', avatarSize: 50, barHeight: 52 },
} as const;

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('Overall');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const fetchOverall = useCallback(async (): Promise<LeaderboardEntry[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, level, xp')
      .order('xp', { ascending: false })
      .limit(50);

    if (error) {
      setFetchError('Could not load leaderboard. Check your connection.');
      return [];
    }
    if (!data || data.length === 0) {
      setFetchError('No users found. Make sure the leaderboard RLS policy allows reading all profiles.');
      return [];
    }

    return data.map(
      (
        u: {
          id: string;
          username?: string;
          first_name?: string;
          last_name?: string;
          level?: number;
          xp?: number;
        },
        i: number
      ) => ({
        rank: i + 1,
        userId: u.id,
        name:
          u.username ||
          `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() ||
          'Unknown',
        level: u.level ?? 1,
        xp: u.xp ?? 0,
      })
    );
  }, []);

  const fetchWeekly = useCallback(async (): Promise<LeaderboardEntry[]> => {
    const monday = getMondayDate();

    // Fetch all profiles and this week's completed missions in parallel
    const [profilesRes, missionsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, first_name, last_name, level')
        .limit(50),
      supabase
        .from('user_missions')
        .select('user_id, missions(xp_reward)')
        .eq('completed', true)
        .gte('date', monday),
    ]);

    if (profilesRes.error) {
      setFetchError('Could not load leaderboard. Check your connection.');
      return [];
    }
    if (!profilesRes.data || profilesRes.data.length === 0) {
      setFetchError('No users found. Make sure the leaderboard RLS policy allows reading all profiles.');
      return [];
    }

    // Build weekly XP map from completed missions
    const xpMap: Record<string, number> = {};
    if (missionsRes.data) {
      for (const row of missionsRes.data as unknown as {
        user_id: string;
        missions: { xp_reward: number } | { xp_reward: number }[] | null;
      }[]) {
        const m = row.missions;
        const reward = Array.isArray(m) ? (m[0]?.xp_reward ?? 0) : (m?.xp_reward ?? 0);
        xpMap[row.user_id] = (xpMap[row.user_id] ?? 0) + reward;
      }
    }

    return (
      profilesRes.data as {
        id: string;
        username?: string;
        first_name?: string;
        last_name?: string;
        level?: number;
      }[]
    )
      .map((u) => ({
        rank: 0,
        userId: u.id,
        name:
          u.username ||
          `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() ||
          'Unknown',
        level: u.level ?? 1,
        xp: xpMap[u.id] ?? 0,
      }))
      .sort((a, b) => b.xp - a.xp)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'Friends') {
        setLeaderboardData([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setFetchError(null);
      const fetch = activeTab === 'Overall' ? fetchOverall : fetchWeekly;
      fetch().then((entries) => {
        setLeaderboardData(entries);
        setLoading(false);
      });
    }, [activeTab, fetchOverall, fetchWeekly]),
  );

  const topThree = leaderboardData.slice(0, 3);
  const currentUser = currentUserId
    ? (leaderboardData.find((u) => u.userId === currentUserId) ?? null)
    : null;

  const renderPodiumUser = (user: LeaderboardEntry, place: 1 | 2 | 3) => {
    const cfg = PODIUM_CONFIG[place];
    const avatarBg = { 1: '#1E4D8C', 2: '#374151', 3: '#78350F' }[place];

    return (
      <View key={user.userId} style={styles.podiumSlot}>
        <View style={styles.crownContainer}>
          {place === 1 && (
            <MaterialCommunityIcons name="crown" size={20} color="#F5B800" />
          )}
        </View>

        <View style={{ position: 'relative', marginBottom: 8 }}>
          <View
            style={[
              styles.podiumAvatarRing,
              {
                width: cfg.avatarSize + 8,
                height: cfg.avatarSize + 8,
                borderRadius: (cfg.avatarSize + 8) / 2,
                borderColor: cfg.ringColor,
              },
            ]}
          >
            <View
              style={[
                styles.podiumAvatar,
                {
                  width: cfg.avatarSize,
                  height: cfg.avatarSize,
                  borderRadius: cfg.avatarSize / 2,
                  backgroundColor: avatarBg,
                },
              ]}
            >
              <Text style={[styles.avatarLetter, { fontSize: cfg.avatarSize * 0.33 }]}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={[styles.rankBadge, { backgroundColor: cfg.ringColor }]}>
            <Text style={styles.rankBadgeText}>{place}</Text>
          </View>
        </View>

        <Text style={styles.podiumName} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={styles.podiumXp}>{formatXP(user.xp)} XP</Text>

        <View
          style={[
            styles.podiumBar,
            { height: cfg.barHeight, backgroundColor: cfg.ringColor + '22' },
          ]}
        />
      </View>
    );
  };

  const renderRow = ({ item: user }: { item: LeaderboardEntry }) => {
    const isCurrentUser = user.userId === currentUserId;
    const rankColor =
      user.rank === 1
        ? '#F5B800'
        : user.rank === 2
        ? '#9BA4B4'
        : user.rank === 3
        ? '#CD7F32'
        : '#C0C8D4';

    return (
      <View style={[styles.row, isCurrentUser && styles.currentUserRow]}>
        <Text style={[styles.rankNumber, { color: rankColor }]}>
          {user.rank}
        </Text>
        <View
          style={[
            styles.avatar,
            { backgroundColor: getAvatarColor(user.rank - 1) },
          ]}
        >
          <Text style={styles.avatarText}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.subtitle}>
            Lv {user.level} · {getLevelTitle(user.level)}
          </Text>
        </View>
        <View style={[styles.xpBadge, isCurrentUser && styles.xpBadgeCurrent]}>
          <Text style={[styles.xpText, isCurrentUser && styles.xpTextCurrent]}>
            {formatXP(user.xp)} XP
          </Text>
        </View>
      </View>
    );
  };

  const insets = useSafeAreaInsets();
  const showPodium = !loading && !fetchError && activeTab !== 'Friends';

  const listHeader = (
    <>
      {/* Podium section */}
      <View style={styles.podiumSection}>
        {/* Segmented tabs */}
        <View style={styles.tabBar}>
          {(['Overall', 'Weekly', 'Friends'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={activeTab === tab ? styles.activeTabText : styles.tabText}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {showPodium && (
          <View style={styles.podiumContainer}>
            {topThree[1] && renderPodiumUser(topThree[1], 2)}
            {topThree[0] && renderPodiumUser(topThree[0], 1)}
            {topThree[2] && renderPodiumUser(topThree[2], 3)}
          </View>
        )}
      </View>

      {/* State messages */}
      {loading && (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      )}
      {fetchError && (
        <View style={styles.stateContainer}>
          <Text style={[styles.stateText, { color: '#DC2626', textAlign: 'center', paddingHorizontal: 32 }]}>
            {fetchError}
          </Text>
        </View>
      )}
      {!loading && !fetchError && activeTab === 'Friends' && (
        <View style={styles.stateContainer}>
          <Ionicons name="people-outline" size={40} color="#C0C8D4" />
          <Text style={[styles.stateText, { marginTop: 12 }]}>
            Friend connections coming soon
          </Text>
        </View>
      )}
      {!loading && !fetchError && activeTab !== 'Friends' && (
        <Text style={styles.sectionLabel}>All Players</Text>
      )}
    </>
  );

  return (
    <View style={styles.safe}>
      {/* Sticky header */}
      <View style={[styles.stickyHeader, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Leaderboard</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="person-add-outline" size={20} color="#1B2B4B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="chatbubble-outline" size={20} color="#1B2B4B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={loading || activeTab === 'Friends' || fetchError ? [] : leaderboardData}
        renderItem={renderRow}
        keyExtractor={(item) => item.userId}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: currentUser && !loading ? 100 : 24 }}
        showsVerticalScrollIndicator={false}
      />

      {currentUser && !loading && (
        <View style={[styles.pinnedWrapper, { paddingBottom: insets.bottom + 65 }]}>
<View style={[styles.row, styles.currentUserRow, { marginBottom: 0 }]}>
            <Text style={[styles.rankNumber, { color: '#2563EB' }]}>{currentUser.rank}</Text>
            <View style={[styles.avatar, { backgroundColor: getAvatarColor(currentUser.rank - 1) }]}>
              <Text style={styles.avatarText}>{currentUser.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.name}>{currentUser.name}</Text>
              <Text style={styles.subtitle}>Lv {currentUser.level} · {getLevelTitle(currentUser.level)}</Text>
            </View>
            <View style={[styles.xpBadge, styles.xpBadgeCurrent]}>
              <Text style={[styles.xpText, styles.xpTextCurrent]}>{formatXP(currentUser.xp)} XP</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  stickyHeader: {
    backgroundColor: '#F0F4F8',
    paddingBottom: 4,
  },
  podiumSection: {
    backgroundColor: '#fff',
    paddingBottom: 12,
  },

  /* ── Header ── */
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0D1829',
    letterSpacing: -0.3,
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

  /* ── Segmented tabs ── */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 13,
  },
  activeTabText: {
    color: '#0D1829',
    fontWeight: '700',
    fontSize: 13,
  },

  /* ── Podium ── */
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    gap: 10,
  },
  podiumSlot: {
    alignItems: 'center',
  },
  crownContainer: {
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  podiumAvatarRing: {
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#fff',
    fontWeight: '800',
  },
  rankBadge: {
    position: 'absolute',
    bottom: -4,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  rankBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0D1829',
  },
  podiumName: {
    color: '#0D1829',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 80,
  },
  podiumXp: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 2,
    marginBottom: 8,
  },
  podiumBar: {
    width: 84,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },

  /* ── State messages ── */
  stateContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 10,
  },

  /* ── List row ── */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  currentUserRow: {
    backgroundColor: '#EBF2FF',
    borderWidth: 1.5,
    borderColor: '#93B4E0',
  },
  rankNumber: {
    width: 28,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D1829',
  },
  subtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  xpBadge: {
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  xpBadgeCurrent: {
    backgroundColor: '#DBEAFE',
  },
  xpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  xpTextCurrent: {
    color: '#1D4ED8',
  },

  /* ── Pinned "Your Rank" ── */
  pinnedWrapper: {
    backgroundColor: '#F0F4F8',
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  pinnedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginHorizontal: 20,
    marginBottom: 6,
  },
});
