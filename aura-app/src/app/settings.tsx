import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Account deletion should be handled
            // through a secure backend/Edge Function.
            Alert.alert(
              'Delete Account',
              'Account deletion will be connected to the server later.'
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* =================================================
          HEADER
          ================================================= */}

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
          Settings
        </Text>

        <View style={{ width: 40 }} />

      </View>

      {/* =================================================
          SETTINGS
          ================================================= */}

      <View style={styles.content}>

        {/* =================================================
            NOTIFICATIONS
            ================================================= */}

        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            router.push('/notifications_settings')
          }
          activeOpacity={0.7}
        >
          <Text style={styles.rowText}>
            Notifications
          </Text>

          <Text style={styles.chevron}>
            ›
          </Text>
        </TouchableOpacity>

        {/* =================================================
            PRIVACY
            ================================================= */}

        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            router.push('/privacy')
          }
          activeOpacity={0.7}
        >
          <Text style={styles.rowText}>
            Privacy
          </Text>

          <Text style={styles.chevron}>
            ›
          </Text>
        </TouchableOpacity>

        {/* =================================================
            CHANGE EMAIL
            ================================================= */}

        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            router.push('/change_email')
          }
          activeOpacity={0.7}
        >
          <Text style={styles.rowText}>
            Change Email
          </Text>

          <Text style={styles.chevron}>
            ›
          </Text>
        </TouchableOpacity>

        {/* =================================================
            CHANGE PASSWORD
            ================================================= */}

        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            router.push('/change_psw')
          }
          activeOpacity={0.7}
        >
          <Text style={styles.rowText}>
            Change Password
          </Text>

          <Text style={styles.chevron}>
            ›
          </Text>
        </TouchableOpacity>

        {/* =================================================
            DELETE ACCOUNT
            ================================================= */}

        <TouchableOpacity
          style={[
            styles.row,
            styles.deleteRow,
          ]}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteText}>
            Delete Account
          </Text>

          <Text style={styles.chevron}>
            ›
          </Text>
        </TouchableOpacity>

      </View>

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

  // =======================================================
  // HEADER
  // =======================================================

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

  // =======================================================
  // CONTENT
  // =======================================================

  content: {
    padding: 16,
    gap: 10,
  },

  // =======================================================
  // ROW
  // =======================================================

  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    minHeight: 64,
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

  // =======================================================
  // DELETE
  // =======================================================

  deleteRow: {
    marginTop: 12,
  },

  deleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E53935',
  },

});