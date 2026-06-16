import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/colors';

function AuraLogo() {
  return (
    <View style={logoStyles.outer}>
      <View style={logoStyles.inner}>
        <View style={logoStyles.bars}>
          <View style={[logoStyles.bar, { height: 26 }]} />
          <View style={[logoStyles.bar, { height: 44 }]} />
          <View style={[logoStyles.bar, { height: 34 }]} />
        </View>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <AuraLogo />
        <Text style={styles.title}>AUra</Text>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.button}>GET STARTED</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.skyBackground,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: 24,
    letterSpacing: -0.5,
  },
  button: {
    alignSelf: 'stretch',
    backgroundColor: '#1B2B4B',
    borderRadius: 30,
    borderWidth: 20,
    borderColor: Colors.navy,
    paddingVertical: 5,
    alignItems: 'center',
    marginTop: 64,
    color: Colors.white,
  },
  buttonPressed: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.navy,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
  },
});

const logoStyles = StyleSheet.create({
  outer: {
    width: 112,
    height: 112,
    borderRadius: 26,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.navyDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  inner: {
    width: 88,
    height: 88,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bar: {
    width: 13,
    borderRadius: 4,
    backgroundColor: Colors.barBlue,
  },
});
