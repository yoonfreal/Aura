import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { fetchAppSettings } from '@/lib/appSettings';

// The root layout redirects here on every app launch while app_settings.maintenance_mode_enabled
// is on (see _layout.tsx) — this screen has no way in or out except an admin flipping that
// toggle back off, which "Try again" re-checks for.
export default function MaintenanceScreen() {
  const [checking, setChecking] = useState(false);

  async function handleRetry() {
    setChecking(true);
    const settings = await fetchAppSettings();
    setChecking(false);
    if (!settings.maintenanceModeEnabled) {
      router.replace('/(auth)/login');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="construct" size={36} color={Colors.gold} />
        </View>
        <Text style={styles.title}>AUra is down for maintenance</Text>
        <Text style={styles.subtitle}>We&rsquo;re making some updates. Please check back shortly.</Text>

        <TouchableOpacity style={styles.button} onPress={handleRetry} disabled={checking} activeOpacity={0.85}>
          {checking ? <ActivityIndicator color={Colors.navy} /> : <Text style={styles.buttonText}>Try again</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.navy },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#B9C4D6', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  button: {
    marginTop: 28,
    backgroundColor: Colors.gold,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    minWidth: 140,
    alignItems: 'center',
  },
  buttonText: { fontSize: 14, fontWeight: '800', color: Colors.navy },
});
