import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

type User = {
  rank: number;
  name: string;
  level: number;
  title: string;
  xp: number;
};

const leaderboardData: User[] = [
  { rank: 1, name: 'Kevin', level: 8, title: 'Warrior', xp: 400 },
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

const currentUserRank = 10;

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState('Weekly');

  const topThree = leaderboardData.slice(0, 3);

  const renderItem = ({ item }: { item: User }) => {
    const isCurrentUser = item.rank === currentUserRank;

    return (
      <View
        style={[
          styles.row,
          isCurrentUser && styles.currentUserRow,
        ]}
      >
        <Text style={styles.rank}>{item.rank}</Text>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0)}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.name}>{item.name}</Text>

          <Text style={styles.subtitle}>
            Level {item.level} • {item.title}
          </Text>
        </View>

        <View style={styles.xpBadge}>
          <Text style={styles.xpText}>
            {item.xp} XP
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>

        <View style={styles.headerIcons}>
          <TouchableOpacity>
            <Ionicons
              name="person-add-outline"
              size={24}
              color="#000"
            />
          </TouchableOpacity>

          <TouchableOpacity>
            <Ionicons
              name="chatbubble-outline"
              size={24}
              color="#000"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['Overall', 'Weekly', 'Friends'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={styles.tab}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab &&
                  styles.activeTabText,
              ]}
            >
              {tab}
            </Text>

            {activeTab === tab && (
              <View style={styles.activeIndicator} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Leaderboard */}
      <FlatList
        style={{ flex: 1 }}
        data={leaderboardData}
        keyExtractor={(item) => item.rank.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 50,
        }}
        ListHeaderComponent={
          <View style={styles.podiumContainer}>
            {/* Second */}
            <View style={styles.secondPlace}>
              <View
                style={[
                  styles.podiumAvatar,
                  { backgroundColor: '#3f7f67' },
                ]}
              >
                <Text style={styles.avatarLetter}>
                  {topThree[1].name[0]}
                </Text>
              </View>

              <Text style={styles.podiumName}>
                {topThree[1].name}
              </Text>

              <View
                style={[
                  styles.podiumBar,
                  styles.secondBar,
                ]}
              />
            </View>

            {/* First */}
            <View style={styles.firstPlace}>
              <MaterialCommunityIcons
                name="crown"
                size={30}
                color="#F5B041"
              />

              <View
                style={[
                  styles.podiumAvatar,
                  { backgroundColor: '#6f7c34' },
                ]}
              >
                <Text style={styles.avatarLetter}>
                  {topThree[0].name[0]}
                </Text>
              </View>

              <Text style={styles.podiumName}>
                {topThree[0].name}
              </Text>

              <View
                style={[
                  styles.podiumBar,
                  styles.firstBar,
                ]}
              />
            </View>

            {/* Third */}
            <View style={styles.thirdPlace}>
              <View
                style={[
                  styles.podiumAvatar,
                  { backgroundColor: '#bdbdbd' },
                ]}
              >
                <Text style={styles.avatarLetter}>
                  {topThree[2].name[0]}
                </Text>
              </View>

              <Text style={styles.podiumName}>
                {topThree[2].name}
              </Text>

              <View
                style={[
                  styles.podiumBar,
                  styles.thirdBar,
                ]}
              />
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

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