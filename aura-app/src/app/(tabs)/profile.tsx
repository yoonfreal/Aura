import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.text}>Profile — coming soon</Text>
        <TouchableOpacity style={styles.signOut} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F6F9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  text: { fontSize: 16, color: '#8A9BB0', fontWeight: '600' },
  signOut: { backgroundColor: '#E53935', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  signOutText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
