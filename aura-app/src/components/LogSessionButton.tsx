import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onPress: () => void;
  loading: boolean;
};

export function LogSessionButton({ onPress, loading }: Props) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} disabled={loading} activeOpacity={0.8}>
      {loading ? (
        <>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.text}>Verifying your photo…</Text>
        </>
      ) : (
        <>
          <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
          <Text style={styles.text}>Log session with photo</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1B2B4B',
    borderRadius: 20,
    paddingVertical: 10,
    marginTop: 10,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
