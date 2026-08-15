import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function ChangePasswordScreen() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    // Check current password
    if (!currentPassword) {
      Alert.alert(
        'Missing Information',
        'Please enter your current password.'
      );
      return;
    }

    // Check new password
    if (!newPassword || !confirmPassword) {
      Alert.alert(
        'Missing Information',
        'Please enter and confirm your new password.'
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        'Password Too Short',
        'Your password must be at least 6 characters long.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Passwords Do Not Match',
        'Please make sure both new passwords are the same.'
      );
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert(
        'Invalid Password',
        'Your new password must be different from your current password.'
      );
      return;
    }

    setLoading(true);

    try {
      // Get the currently signed-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          'Error',
          'Unable to find your account. Please sign in again.'
        );
        return;
      }

      if (!user.email) {
        Alert.alert(
          'Error',
          'No email address is associated with this account.'
        );
        return;
      }

      // Verify the current password
      const { error: verificationError } =
        await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

      if (verificationError) {
        Alert.alert(
          'Incorrect Password',
          'Your current password is incorrect.'
        );
        return;
      }

      // Current password is correct.
      // Now update to the new password.
      const { error: updateError } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (updateError) {
        Alert.alert(
          'Error',
          updateError.message
        );
        return;
      }

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      Alert.alert(
        'Password Changed',
        'Your password has been successfully updated.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Change password error:', error);

      Alert.alert(
        'Error',
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Change Password
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>

        {/* Current Password */}
        <Text style={styles.label}>
          Current Password
        </Text>

        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter your current password"
          placeholderTextColor="#A6ADBB"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        {/* New Password */}
        <Text style={styles.label}>
          New Password
        </Text>

        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter your new password"
          placeholderTextColor="#A6ADBB"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        {/* Confirm New Password */}
        <Text style={styles.label}>
          Confirm New Password
        </Text>

        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm your new password"
          placeholderTextColor="#A6ADBB"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <Text style={styles.description}>
          Your new password should be at least 6 characters
          long and different from your current password.
        </Text>

        {/* Change Password Button */}
        <TouchableOpacity
          style={[
            styles.button,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleChangePassword}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              Change Password
            </Text>
          )}
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
    padding: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E2430',
    marginBottom: 8,
    marginTop: 8,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E2430',
    borderWidth: 1,
    borderColor: '#E3E7F0',
  },

  description: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8A93A6',
    marginTop: 10,
  },

  button: {
    backgroundColor: '#1B2A41',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});