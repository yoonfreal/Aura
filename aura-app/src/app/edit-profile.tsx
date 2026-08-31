import { useEffect, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useUserStore();

  // =====================================================
  // FORM
  // =====================================================

  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        Alert.alert('Error', 'User not found.');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          username,
          first_name,
          last_name,
          age,
          gender
        `)
        .eq('id', authUser.id)
        .single();

      if (error) {
        throw error;
      }

      setUsername(data?.username ?? '');
      setAge(
        data?.age != null
          ? String(data.age)
          : ''
      );
      setGender(data?.gender ?? '');

    } catch (error: any) {
      console.error(
        'Error loading profile:',
        error
      );

      Alert.alert(
        'Error',
        error?.message ||
          'Could not load profile.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert(
        'Error',
        'Username cannot be empty.'
      );
      return;
    }


    // Check age
    if (age.trim()) {
      const ageNumber = Number(age.trim());

      if (
        !Number.isInteger(ageNumber) ||
        ageNumber < 1 ||
        ageNumber > 120
      ) {
        Alert.alert(
          'Invalid Age',
          'Please enter a valid age.'
        );
        return;
      }
    }

    try {
      setSaving(true);

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        Alert.alert(
          'Error',
          'User not found.'
        );
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),

          age: age.trim()
            ? Number(age.trim())
            : null,

          gender: gender || null,
        })
        .eq('id', authUser.id);

      if (error) {
        throw error;
      }

      Alert.alert(
        'Success',
        'Profile updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );

    } catch (error: any) {
      console.error(
        'Error updating profile:',
        error
      );

      Alert.alert(
        'Error',
        error?.message ||
          'Could not update profile.'
      );

    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // AVATAR
  // =====================================================

  const avatarLetter =
    (
      username.trim() ||
      'U'
    )
      .charAt(0)
      .toUpperCase();

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={styles.loadingContainer}
        >
          <Text
            style={styles.loadingText}
          >
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* HEADER */}

        <View
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => router.back()}
          >
            <ArrowLeft
              size={24}
              color="#1E2430"
            />
          </TouchableOpacity>

          <Text
            style={styles.headerTitle}
          >
            Edit Profile
          </Text>

          <View
            style={{ width: 24 }}
          />
        </View>

        <View
          style={styles.content}
        >

          {/* AVATAR */}

          <View
            style={styles.avatar}
          >
            <Text
              style={styles.avatarText}
            >
              {avatarLetter}
            </Text>
          </View>

          {/* USERNAME */}

          <Text
            style={styles.label}
          >
            Username
          </Text>

          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor="#A6ADBB"
            autoCapitalize="none"
            style={styles.input}
          />


          {/* AGE */}

          <Text
            style={styles.label}
          >
            Age
          </Text>

          <TextInput
            value={age}
            onChangeText={setAge}
            placeholder="Enter your age"
            placeholderTextColor="#A6ADBB"
            keyboardType="number-pad"
            maxLength={3}
            style={styles.input}
          />

          {/* GENDER */}

          <Text
            style={styles.label}
          >
            Gender
          </Text>

          <View
            style={styles.genderRow}
          >

            {/* MALE */}

            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === 'Male' &&
                  styles.genderButtonActive,
              ]}
              onPress={() =>
                setGender('Male')
              }
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === 'Male' &&
                    styles.genderTextActive,
                ]}
              >
                Male
              </Text>
            </TouchableOpacity>

            {/* FEMALE */}

            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === 'Female' &&
                  styles.genderButtonActive,
              ]}
              onPress={() =>
                setGender('Female')
              }
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === 'Female' &&
                    styles.genderTextActive,
                ]}
              >
                Female
              </Text>
            </TouchableOpacity>

            {/* OTHER */}

            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === 'Other' &&
                  styles.genderButtonActive,
              ]}
              onPress={() =>
                setGender('Other')
              }
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === 'Other' &&
                    styles.genderTextActive,
                ]}
              >
                Other
              </Text>
            </TouchableOpacity>

          </View>

          {/* SAVE BUTTON */}

          <TouchableOpacity
            style={[
              styles.saveButton,
              saving &&
                styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text
              style={styles.saveButtonText}
            >
              {saving
                ? 'Saving...'
                : 'Save Changes'}
            </Text>
          </TouchableOpacity>

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
    paddingBottom: 40,
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
    marginTop: 10,
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
    marginTop: 14,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E2430',
  },

  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },

  genderButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7F0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  genderButtonActive: {
    backgroundColor: '#1B2A41',
    borderColor: '#1B2A41',
  },

  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E2430',
  },

  genderTextActive: {
    color: '#FFFFFF',
  },

  saveButton: {
    backgroundColor: '#1B2A41',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 28,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    fontSize: 14,
    color: '#8A93A6',
  },
});