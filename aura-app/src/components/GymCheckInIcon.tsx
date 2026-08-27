import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkInToGym, fetchCheckInStatusToday } from '@/lib/gymCheckins';

interface Props {
  userId: string;
}

export function GymCheckInIcon({ userId }: Props) {
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCheckInStatusToday(userId).then(setCheckedIn);
  }, [userId]);

  async function handlePress() {
    if (checkedIn) {
      Alert.alert('Already checked in', "You've already checked in at the gym today ✓");
      return;
    }

    setLoading(true);
    const result = await checkInToGym(userId);
    setLoading(false);

    if (result.success) {
      setCheckedIn(true);
      Alert.alert('Checked in!', "You're checked in at the gym today 🏋️");
      return;
    }

    switch (result.reason) {
      case 'permission_denied':
        Alert.alert('Location needed', 'Turn on location access to check in at the gym.');
        break;
      case 'too_far':
        Alert.alert('Too far from the gym', `You're about ${result.distanceMeters}m away — get closer and try again.`);
        break;
      case 'already_checked_in':
        setCheckedIn(true);
        break;
      default:
        Alert.alert('Error', 'Could not check in right now. Try again.');
    }
  }

  return (
    <TouchableOpacity style={styles.iconBtn} onPress={handlePress} disabled={loading}>
      {loading ? (
        <ActivityIndicator size="small" color="#1B2B4B" />
      ) : (
        <Ionicons
          name={checkedIn ? 'checkmark-circle' : 'location-outline'}
          size={20}
          color={checkedIn ? '#22C55E' : '#1B2B4B'}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
});
