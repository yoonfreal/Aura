import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';

import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function PrivacyScreen() {
  const router = useRouter();

  const [profilePublic, setProfilePublic] = useState(true);
  const [activityVisible, setActivityVisible] = useState(true);
  const [friendRequests, setFriendRequests] = useState(true);

  const handleProfileVisibility = () => {
    Alert.alert(
      'Profile Visibility',
      profilePublic
        ? 'Your profile is currently public. Other users can view your profile.'
        : 'Your profile is currently private. Only approved friends can view your profile.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Privacy</Text>

        <View style={{ width: 40 }} />
      </View>

      {/* Privacy Settings */}
      <View style={styles.content}>

        {/* Profile Visibility */}
        <TouchableOpacity
          style={styles.row}
          onPress={handleProfileVisibility}
          activeOpacity={0.7}
        >
          <View style={styles.textContainer}>
            <Text style={styles.rowText}>Profile Visibility</Text>

            <Text style={styles.description}>
              {profilePublic
                ? 'Your profile is visible to other users'
                : 'Your profile is private'}
            </Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Activity Visibility */}
        <View style={styles.row}>
          <View style={styles.textContainer}>
            <Text style={styles.rowText}>
              Show Activity to Friends
            </Text>

            <Text style={styles.description}>
              Allow friends to see your XP, streaks and badges
            </Text>
          </View>

          <Switch
            value={activityVisible}
            onValueChange={setActivityVisible}
          />
        </View>

        {/* Friend Requests */}
        <View style={styles.row}>
          <View style={styles.textContainer}>
            <Text style={styles.rowText}>
              Allow Friend Requests
            </Text>

            <Text style={styles.description}>
              Allow other users to send you friend requests
            </Text>
          </View>

          <Switch
            value={friendRequests}
            onValueChange={setFriendRequests}
          />
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E7ECF5',
  },

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

  content: {
    padding: 16,
    gap: 10,
  },

  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

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

  chevron: {
    fontSize: 25,
    color: '#8A93A6',
  },
});