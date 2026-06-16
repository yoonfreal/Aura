import { useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Alert,
  Animated,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

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

export default function AuthScreen() {
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');
  const [agreed, setAgreed] = useState(false);
  const pillX = useRef(new Animated.Value(0)).current;
  const [pillWidth, setPillWidth] = useState(0);

  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  async function handleSignUp() {
    if (!signupFirstName || !signupLastName || !signupUsername || !signupEmail || !signupPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(signupUsername)) {
      Alert.alert('Invalid Username', 'Username must be 3–20 characters and contain only lowercase letters, numbers, or underscores.');
      return;
    }
    if (!agreed) {
      Alert.alert('Error', 'Please agree to the Terms and Conditions.');
      return;
    }
    setSignupLoading(true);

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', signupUsername)
      .maybeSingle();

    if (existing) {
      setSignupLoading(false);
      Alert.alert('Username Taken', 'That username is already in use. Please choose another.');
      return;
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: { data: { first_name: signupFirstName, last_name: signupLastName, username: signupUsername } },
    });

    if (error || !authData.user) {
      setSignupLoading(false);
      Alert.alert('Sign Up Failed', error?.message ?? 'Something went wrong.');
      return;
    }

    await supabase.from('profiles').insert({
      id: authData.user.id,
      username: signupUsername,
      first_name: signupFirstName,
      last_name: signupLastName,
    });

    setSignupLoading(false);
    Alert.alert('Check your email', 'We sent you a confirmation link to activate your account.');
  }

  async function handleLogIn() {
    if (!loginEmail || !loginPassword) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoginLoading(false);
    if (error) {
      Alert.alert('Login Failed', error.message);
    } else {
      router.replace('/(tabs)' as any);
    }
  }

  function handleTabsLayout(e: LayoutChangeEvent) {
    const totalWidth = e.nativeEvent.layout.width;
    const half = (totalWidth - 8) / 2;
    setPillWidth(half);
  }

  function switchTab(t: 'signup' | 'login') {
    if (t === activeTab) return;
    Animated.spring(pillX, {
      toValue: t === 'login' ? pillWidth : 0,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
    setActiveTab(t);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.logoSection}>
          <AuraLogo />
          <Text style={styles.title}>AUra</Text>
        </View>

        <View style={styles.tabs} onLayout={handleTabsLayout}>
          <Animated.View
            style={[
              styles.pill,
              { width: pillWidth, transform: [{ translateX: pillX }] },
            ]}
          />
          <TouchableOpacity
            style={styles.tabTouchable}
            onPress={() => switchTab('signup')}
            activeOpacity={1}
          >
            <Text style={activeTab === 'signup' ? styles.activeTabText : styles.inactiveTabText}>
              Sign Up
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabTouchable}
            onPress={() => switchTab('login')}
            activeOpacity={1}
          >
            <Text style={activeTab === 'login' ? styles.activeTabText : styles.inactiveTabText}>
              Log In
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {activeTab === 'signup' ? (
            <>
              <TextInput
                placeholder="First Name"
                placeholderTextColor="#999"
                style={styles.input}
                value={signupFirstName}
                onChangeText={setSignupFirstName}
              />
              <TextInput
                placeholder="Last Name"
                placeholderTextColor="#999"
                style={styles.input}
                value={signupLastName}
                onChangeText={setSignupLastName}
              />
              <TextInput
                placeholder="Username"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                value={signupUsername}
                onChangeText={(t) => setSignupUsername(t.toLowerCase())}
              />
              <TextInput
                placeholder="Email Address"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                value={signupEmail}
                onChangeText={setSignupEmail}
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#999"
                secureTextEntry
                style={styles.input}
                value={signupPassword}
                onChangeText={setSignupPassword}
              />
              <View style={styles.termsRow}>
                <TouchableOpacity
                  style={[styles.checkbox, agreed && styles.checkboxChecked]}
                  onPress={() => setAgreed(!agreed)}
                >
                  {agreed && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <Text style={styles.terms}>
                  Agree with{' '}
                  <Text style={styles.link}>Terms and Conditions</Text>
                </Text>
              </View>
              <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={signupLoading}>
                <Text style={styles.buttonText}>{signupLoading ? 'SIGNING UP...' : 'SIGN UP'}</Text>
              </TouchableOpacity>
              <Text style={styles.footer}>
                Already have an account?{' '}
                <Text style={styles.link} onPress={() => switchTab('login')}>
                  Login
                </Text>
              </Text>
            </>
          ) : (
            <>
              <TextInput
                placeholder="Email Address"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                value={loginEmail}
                onChangeText={setLoginEmail}
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#999"
                secureTextEntry
                style={styles.input}
                value={loginPassword}
                onChangeText={setLoginPassword}
              />
              <Text style={styles.forgotPassword}>FORGOT PASSWORD?</Text>
              <TouchableOpacity style={styles.button} onPress={handleLogIn} disabled={loginLoading}>
                <Text style={styles.buttonText}>{loginLoading ? 'LOGGING IN...' : 'LOG IN'}</Text>
              </TouchableOpacity>
              <Text style={styles.footer}>
                Don't have an account?{' '}
                <Text style={styles.link} onPress={() => switchTab('signup')}>
                  Sign up
                </Text>
              </Text>
            </>
          )}
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

  pill: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: Colors.navy,
    borderRadius: 11,
    shadowColor: Colors.navyDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  tabTouchable: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 1,
  },

  activeTabText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },

  inactiveTabText: {
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
    height: 44,
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 10,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxChecked: {
    backgroundColor: Colors.navy,
  },

  checkmark: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 15,
  },

  terms: {
    color: '#333',
    flexShrink: 1,
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
    marginTop: 20,
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
