import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function ChangeEmailScreen() {
  const router = useRouter();

  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCurrentEmail();
  }, []);

  const loadCurrentEmail = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      setCurrentEmail(user.email);
    }
  };

  const handleChangeEmail = async () => {
    const email = newEmail.trim();

    if (!email) {
      Alert.alert('Missing Email', 'Please enter your new email address.');
      return;
    }

    if (email === currentEmail) {
      Alert.alert(
        'Same Email',
        'Your new email is the same as your current email.'
      );
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        email,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Check Your Email',
        'A confirmation email has been sent. Please check your email to complete the change.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );

      setNewEmail('');
    } catch (error) {
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
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Change Email</Text>

        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>

        <Text style={styles.label}>Current Email</Text>

        <View style={styles.currentEmailBox}>
          <Text style={styles.currentEmail}>
            {currentEmail || 'Loading...'}
          </Text>
        </View>

        <Text style={styles.label}>New Email</Text>

        <TextInput
          style={styles.input}
          value={newEmail}
          onChangeText={setNewEmail}
          placeholder="Enter your new email"
          placeholderTextColor="#A6ADBB"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <Text style={styles.description}>
          You may need to confirm your new email address before the change
          takes effect.
        </Text>

        <TouchableOpacity
          style={[
            styles.button,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleChangeEmail}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Change Email</Text>
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

  currentEmailBox: {
    backgroundColor: '#EEF0F5',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },

  currentEmail: {
    fontSize: 15,
    color: '#8A93A6',
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