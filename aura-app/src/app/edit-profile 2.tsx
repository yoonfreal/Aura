import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useUserStore();

  const [username, setUsername] = useState(user?.username ?? '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username cannot be empty.');
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        Alert.alert('Error', 'User not found.');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
        })
        .eq('id', authUser.id);

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Profile updated.');

      router.back();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Could not update profile.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>

        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1E2430" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Edit Profile
        </Text>

        <View style={{ width: 24 }} />

      </View>


      <View style={styles.content}>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {username.charAt(0).toUpperCase()}
          </Text>
        </View>


        <Text style={styles.label}>
          Username
        </Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Enter username"
          style={styles.input}
        />


        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Text>
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

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E2430',
  },

  content: {
    paddingHorizontal: 20,
    marginTop: 20,
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#2F5D4E',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E2430',
    marginBottom: 8,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },

  saveButton: {
    backgroundColor: '#1B2A41',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

});