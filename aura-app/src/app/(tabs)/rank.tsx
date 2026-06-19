import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type User = {
  rank: number;
  name: string;
  level: number;
  title: string;
  xp: number;
};

const currentUserRank = 10;

const MOCK_DATA: User[] = [
  { rank: 1, name: 'Kevin', level: 8, title: 'Active', xp: 400 },
  { rank: 2, name: 'Natasha', level: 15, title: 'Athlete', xp: 380 },
  { rank: 3, name: 'Tom', level: 10, title: 'Active', xp: 290 },
  { rank: 4, name: 'Chris', level: 8, title: 'Active', xp: 250 },
  { rank: 5, name: 'Emma', level: 11, title: 'Warrior', xp: 230 },
  { rank: 6, name: 'Alex', level: 12, title: 'Runner', xp: 220 },
  { rank: 7, name: 'Mia', level: 6, title: 'Active', xp: 210 },
  { rank: 8, name: 'Leo', level: 9, title: 'Athlete', xp: 190 },
  { rank: 9, name: 'Ryan', level: 7, title: 'Active', xp: 180 },
  { rank: 10, name: 'Jane', level: 5, title: 'Beginner', xp: 160 },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: 34,
    fontWeight: '700',
  },

  headerIcons: {
    flexDirection: 'row',
    gap: 18,
  },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#E5E5E5',
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },

  tabText: {
    color: '#888',
    fontWeight: '500',
  },

  activeTabText: {
    color: '#000',
    fontWeight: '700',
  },

  activeIndicator: {
    marginTop: 8,
    height: 2,
    width: '100%',
    backgroundColor: '#000',
  },

  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingVertical: 30,
  },

  firstPlace: {
    alignItems: 'center',
    marginHorizontal: 8,
  },

  secondPlace: {
    alignItems: 'center',
  },

  thirdPlace: {
    alignItems: 'center',
  },

  podiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarLetter: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 20,
  },

  podiumName: {
    marginVertical: 8,
    fontWeight: '600',
  },

  podiumBar: {
    width: 75,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },

  firstBar: {
    height: 160,
    backgroundColor: '#336999',
  },

  secondBar: {
    height: 110,
    backgroundColor: '#E76F24',
  },

  thirdBar: {
    height: 90,
    backgroundColor: '#E8B737',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#EFEFEF',
  },

  currentUserRow: {
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: 18,
    backgroundColor: '#EAF2FF',
    borderBottomWidth: 0,
  },

  rank: {
    width: 32,
    fontSize: 18,
    color: '#666',
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#466A92',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  avatarText: {
    color: '#fff',
    fontWeight: '700',
  },

  userInfo: {
    flex: 1,
  },

  name: {
    fontSize: 16,
    fontWeight: '600',
  },

  subtitle: {
    color: '#777',
    marginTop: 2,
  },

  xpBadge: {
    backgroundColor: '#E8EFF8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  xpText: {
    fontWeight: '700',
    color: '#2B4D76',
  },
});

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState('Weekly');
  const [leaderboardData, setLeaderboardData] = useState<User[]>(MOCK_DATA);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('xp', { ascending: false });

    if (error || !data || data.length === 0) {
      return;
    }

    const formatted: User[] = data.map(
      (user: { username?: string; first_name?: string; last_name?: string; level?: number; streak_days?: number; xp?: number }, index: number) => ({
        rank: index + 1,
        name:
          user.username ||
          `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
        level: user.level ?? 1,
        title: `${user.streak_days ?? 0} Day Streak`,
        xp: user.xp ?? 0,
      })
    );

    setLeaderboardData(formatted);
  };

  const topThree = leaderboardData.slice(0, 3);

  const renderPodiumUser = (user: User, place: 1 | 2 | 3) => {
    const avatarColor =
      place === 1
        ? '#336999'
        : place === 2
        ? '#E76F24'
        : '#E8B737';

    const barStyle =
      place === 1
        ? styles.firstBar
        : place === 2
        ? styles.secondBar
        : styles.thirdBar;

    const placeStyle =
      place === 1
        ? styles.firstPlace
        : place === 2
        ? styles.secondPlace
        : styles.thirdPlace;

    return (
      <View key={place} style={placeStyle}>
        <View style={[styles.podiumAvatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarLetter}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.podiumName}>{user.name}</Text>
        <Text style={{ fontSize: 12, color: '#666' }}>
          Level {user.level}
        </Text>
        <View style={[styles.podiumBar, barStyle]} />
      </View>
    );
  };

  const renderLeaderboardRow = (user: User) => {
    const isCurrentUser = user.rank === currentUserRank;
    return (
      <View
        key={user.rank}
        style={[styles.row, isCurrentUser && styles.currentUserRow]}
      >
        <Text style={styles.rank}>{user.rank}</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.subtitle}>{user.title}</Text>
        </View>
        <View style={styles.xpBadge}>
          <Text style={styles.xpText}>{user.xp} XP</Text>
        </View>
      </View>
    );
  };

  const listHeader = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity>
            <Ionicons name="search" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="settings-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        {['Weekly', 'Monthly', 'All Time'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tab}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={
                activeTab === tab
                  ? styles.activeTabText
                  : styles.tabText
              }
            >
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.podiumContainer}>
        {topThree[1] && renderPodiumUser(topThree[1], 2)}
        {topThree[0] && renderPodiumUser(topThree[0], 1)}
        {topThree[2] && renderPodiumUser(topThree[2], 3)}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={leaderboardData.slice(3)}
        renderItem={({ item }) => renderLeaderboardRow(item)}
        keyExtractor={(item) => item.rank.toString()}
        ListHeaderComponent={listHeader}
      />
    </SafeAreaView>
  );
}