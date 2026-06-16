import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogIn() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Login Failed', error.message);
    } else {
      router.replace('/(tabs)' as any);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <AuraLogo />
          <Text style={styles.title}>AUra</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity style={styles.tabInactive} onPress={() => router.replace('/(auth)/signup')}>
            <Text style={styles.inactiveTab}>Sign Up</Text>
          </TouchableOpacity>

          <View style={styles.tabActive}>
            <Text style={styles.activeTab}>Log In</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            placeholder="Email Address"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          {/* Forgot Password */}
          <Text style={styles.forgotPassword}>
            FORGOT PASSWORD?
          </Text>

          {/* Button */}
          <TouchableOpacity style={styles.button} onPress={handleLogIn} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'LOGGING IN...' : 'LOG IN'}
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <Text style={styles.footer}>
            Don't have an account?{' '}
            <Text
              style={styles.link}
              onPress={() =>
                router.replace('/(auth)/signup')
              }
            >
              Sign up
            </Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.skyBackground,
  },

  container: {
    flex: 1,
    paddingHorizontal: 28,
  },

  logoSection: {
    alignItems: 'center',
    marginTop: 40,
  },

  title: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: 24,
    letterSpacing: -0.5,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#D6E8F5',
    borderRadius: 14,
    padding: 4,
    marginTop: 24,
  },

  tabActive: {
    flex: 1,
    backgroundColor: Colors.navy,
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: Colors.navyDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  tabInactive: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },

  activeTab: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },

  inactiveTab: {
    fontSize: 16,
    fontWeight: '500',
    color: '#7A92AA',
  },

  form: {
    marginTop: 18,
  },

  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -6,
    marginBottom: 18,
    fontSize: 13,
    color: Colors.navy,
    fontWeight: '500',
  },

  button: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },

  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },

  footer: {
    textAlign: 'center',
    marginTop: 18,
    color: '#333',
  },

  link: {
    color: Colors.navy,
    fontWeight: '600',
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