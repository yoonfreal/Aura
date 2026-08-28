import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';

import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
  const router = useRouter();

  // Main notification switch
  const [pushNotifications, setPushNotifications] =
    useState(true);

  // Activity
  const [friendRequests, setFriendRequests] =
    useState(true);

  const [reactions, setReactions] =
    useState(true);

  const [comments, setComments] =
    useState(true);

  const [activityJoined, setActivityJoined] =
    useState(true);

  // Challenges
  const [challengeInvites, setChallengeInvites] =
    useState(true);

  const [challengeAccepted, setChallengeAccepted] =
    useState(true);

  const [challengeEnding, setChallengeEnding] =
    useState(true);

  // Achievements
  const [badgeUnlocked, setBadgeUnlocked] =
    useState(true);

  const [levelUp, setLevelUp] =
    useState(true);

  const [streakReminder, setStreakReminder] =
    useState(true);

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}

      <View style={styles.header}>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Notifications
        </Text>

        <View style={{ width: 40 }} />

      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* =================================================
            GENERAL
            ================================================= */}

        <Text style={styles.sectionTitle}>
          GENERAL
        </Text>

        <View style={styles.row}>

          <View style={styles.textContainer}>

            <Text style={styles.rowText}>
              Push Notifications
            </Text>

            <Text style={styles.description}>
              Receive notifications from Aura
            </Text>

          </View>

          <Switch
            value={pushNotifications}
            onValueChange={
              setPushNotifications
            }
          />

        </View>

        {/* =================================================
            ACTIVITY
            ================================================= */}

        <Text style={styles.sectionTitle}>
          ACTIVITY
        </Text>

        <View style={styles.card}>

          {/* Friend Requests */}

          <View style={styles.innerRow}>

            <View style={styles.textContainer}>

              <Text style={styles.rowText}>
                Friend Requests
              </Text>

              <Text style={styles.description}>
                When someone sends you a
                friend request
              </Text>

            </View>

            <Switch
              value={friendRequests}
              onValueChange={
                setFriendRequests
              }
              disabled={!pushNotifications}
            />

          </View>

          {/* Reactions */}

          <View style={styles.innerRow}>

            <View style={styles.textContainer}>

              <Text style={styles.rowText}>
                Reactions
              </Text>

              <Text style={styles.description}>
                When someone reacts to your post
              </Text>

            </View>

            <Switch
              value={reactions}
              onValueChange={
                setReactions
              }
              disabled={!pushNotifications}
            />

          </View>

          {/* Comments */}

          <View style={styles.innerRow}>

            <View style={styles.textContainer}>

              <Text style={styles.rowText}>
                Comments
              </Text>

              <Text style={styles.description}>
                When someone comments on your post
              </Text>

            </View>

            <Switch
              value={comments}
              onValueChange={
                setComments
              }
              disabled={!pushNotifications}
            />

          </View>

          {/* Activity Joined */}

          <View
            style={[
              styles.innerRow,
              styles.lastRow,
            ]}
          >

            <View style={styles.textContainer}>

              <Text style={styles.rowText}>
                Activity Joined
              </Text>

              <Text style={styles.description}>
                When someone joins your activity
              </Text>

            </View>

            <Switch
              value={activityJoined}
              onValueChange={
                setActivityJoined
              }
              disabled={!pushNotifications}
            />

          </View>

        </View>

        {/* =================================================
            CHALLENGES
            ================================================= */}

        <Text style={styles.sectionTitle}>
          CHALLENGES
        </Text>

        <View style={styles.card}>

          {/* Challenge Invitations */}

          <View style={styles.innerRow}>

            <View style={styles.textContainer}>

              <Text style={styles.rowText}>
                Challenge Invitations
              </Text>

              <Text style={styles.description}>
                When someone challenges you
              </Text>

            </View>

            <Switch
              value={challengeInvites}
              onValueChange={
                setChallengeInvites
              }
              disabled={!pushNotifications}
            />

          </View>

          {/* Challenge Accepted */}

          <View style={styles.innerRow}>

            <View style={styles.textContainer}>

              <Text style={styles.rowText}>
                Challenge Accepted
              </Text>

              <Text style={styles.description}>
                When someone accepts your challenge
              </Text>

            </View>

            <Switch
              value={challengeAccepted}
              onValueChange={
                setChallengeAccepted
              }
              disabled={!pushNotifications}
            />

          </View>

          {/* Challenge Ending */}

          <View
            style={[
              styles.innerRow,
              styles.lastRow,
            ]}
          >

            <View style={styles.textContainer}>

              <Text style={styles.rowText}>
                Challenge Ending Soon
              </Text>

              <Text style={styles.description}>
                Reminder before a challenge ends
              </Text>

            </View>

            <Switch
              value={challengeEnding}
              onValueChange={
                setChallengeEnding
              }
              disabled={!pushNotifications}
            />

          </View>

        </View>

        {/* =================================================
            ACHIEVEMENTS
            ================================================= */}

        <Text style={styles.sectionTitle}>
          ACHIEVEMENTS
        </Text>

        <View style={styles.card}>

          {/* Badge */}

          <View style={styles.innerRow}>

            <View style={styles.textContainer}>

              <Text style={styles.rowText}>
                Badge Unlocked
              </Text>

              <Text style={styles.description}>
                When you earn a new badge
              </Text>

            </View>

            <Switch
              value={badgeUnlocked}
              onValueChange={
                setBadgeUnlocked
              }
              disabled={!pushNotifications}
            />

          </View>

          {/* Level Up */}

          <View style={styles.innerRow}>

            <View style={styles.textContainer}>

              <Text style={styles.rowText}>
                Level Up
              </Text>

              <Text style={styles.description}>
                When you reach a new level
              </Text>

            </View>

            <Switch
              value={levelUp}
              onValueChange={
                setLevelUp
              }
              disabled={!pushNotifications}
            />

          </View>

          {/* Streak */}

          <View
            style={[
              styles.innerRow,
              styles.lastRow,
            ]}
          >

            <View style={styles.textContainer}>

              <Text style={styles.rowText}>
                Streak Reminder
              </Text>

              <Text style={styles.description}>
                Reminders to keep your streak
              </Text>

            </View>

            <Switch
              value={streakReminder}
              onValueChange={
                setStreakReminder
              }
              disabled={!pushNotifications}
            />

          </View>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#E7ECF5',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // HEADER

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },

  backText: {
    fontSize: 34,
    color: '#1E2430',
    lineHeight: 36,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E2430',
  },

  // SECTION

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6F788A',
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
  },

  // SINGLE ROW

  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // CARD

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },

  // CARD ROW

  innerRow: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },

  lastRow: {
    borderBottomWidth: 0,
  },

  // TEXT

  textContainer: {
    flex: 1,
    paddingRight: 12,
  },

  rowText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E2430',
  },

  description: {
    fontSize: 12,
    lineHeight: 17,
    color: '#8A93A6',
    marginTop: 4,
  },

});