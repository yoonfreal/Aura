import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useUserStore } from '@/store/userStore';
import {
  fetchNotificationPreferences,
  updateNotificationPreference,
} from '@/lib/notificationPreferences';

type PreferencePatch = Partial<{
  push_enabled: boolean;
  friend_requests: boolean;
  reactions: boolean;
  comments: boolean;
  challenge_invites: boolean;
  challenge_accepted: boolean;
  challenge_ending_soon: boolean;
  streak_reminder: boolean;
}>;

export default function NotificationsScreen() {
  const router = useRouter();
  const userId = useUserStore((state) => state.user?.id);

  const [loading, setLoading] = useState(true);

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

  // Challenges
  const [challengeInvites, setChallengeInvites] =
    useState(true);

  const [challengeAccepted, setChallengeAccepted] =
    useState(true);

  const [challengeEnding, setChallengeEnding] =
    useState(true);

  // Achievements
  const [streakReminder, setStreakReminder] =
    useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchNotificationPreferences(userId)
      .then((prefs) => {
        setPushNotifications(prefs.pushEnabled);
        setFriendRequests(prefs.friendRequests);
        setReactions(prefs.reactions);
        setComments(prefs.comments);
        setChallengeInvites(prefs.challengeInvites);
        setChallengeAccepted(prefs.challengeAccepted);
        setChallengeEnding(prefs.challengeEndingSoon);
        setStreakReminder(prefs.streakReminder);
      })
      .catch((error) =>
        console.error('Failed to load notification preferences', error)
      )
      .finally(() => setLoading(false));
  }, [userId]);

  function save(patch: PreferencePatch) {
    if (!userId) return;
    updateNotificationPreference(userId, patch).catch((error) =>
      console.error('Failed to save notification preference', error)
    );
  }

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

      {loading ? (

        <ActivityIndicator
          color="#1B2B4B"
          style={{ marginTop: 40 }}
        />

      ) : (

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
            style={styles.switchSmall}
            value={pushNotifications}
            onValueChange={(value) => {
              setPushNotifications(value);
              save({ push_enabled: value });
            }}
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
              style={styles.switchSmall}
              value={friendRequests}
              onValueChange={(value) => {
                setFriendRequests(value);
                save({ friend_requests: value });
              }}
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
              style={styles.switchSmall}
              value={reactions}
              onValueChange={(value) => {
                setReactions(value);
                save({ reactions: value });
              }}
              disabled={!pushNotifications}
            />

          </View>

          {/* Comments */}

          <View
            style={[
              styles.innerRow,
              styles.lastRow,
            ]}
          >

            <View style={styles.textContainer}>

              <Text style={styles.rowText}>
                Comments
              </Text>

              <Text style={styles.description}>
                When someone comments on your post
              </Text>

            </View>

            <Switch
              style={styles.switchSmall}
              value={comments}
              onValueChange={(value) => {
                setComments(value);
                save({ comments: value });
              }}
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
              style={styles.switchSmall}
              value={challengeInvites}
              onValueChange={(value) => {
                setChallengeInvites(value);
                save({ challenge_invites: value });
              }}
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
              style={styles.switchSmall}
              value={challengeAccepted}
              onValueChange={(value) => {
                setChallengeAccepted(value);
                save({ challenge_accepted: value });
              }}
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
              style={styles.switchSmall}
              value={challengeEnding}
              onValueChange={(value) => {
                setChallengeEnding(value);
                save({ challenge_ending_soon: value });
              }}
              disabled={!pushNotifications}
            />

          </View>

        </View>

        {/* =================================================
            ACHIEVEMENTS
            ================================================= */}

        <Text style={styles.sectionTitle}>
          STREAKS
        </Text>

        <View style={styles.card}>

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
              style={styles.switchSmall}
              value={streakReminder}
              onValueChange={(value) => {
                setStreakReminder(value);
                save({ streak_reminder: value });
              }}
              disabled={!pushNotifications}
            />

          </View>

        </View>

      </ScrollView>

      )}

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

  // SWITCH

  switchSmall: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },

});