import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';

import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Settings</Text>

        <View style={{ width: 40 }} />
      </View>

      {/* Settings */}
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.rowText}>Notifications</Text>

          <Switch
            value={notifications}
            onValueChange={setNotifications}
          />
        </View>

        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowText}>Privacy</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowText}>Change Password</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  rowText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E2430',
  },

  chevron: {
    fontSize: 25,
    color: '#8A93A6',
  },
});