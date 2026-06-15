import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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

export default function SignUpScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.logoSection}>
          <AuraLogo />
          <Text style={styles.title}>AUra</Text>
        </View>

        <View style={styles.tabs}>
          <Text style={styles.activeTab}>Sign Up</Text>

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.inactiveTab}>Log In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <TextInput
            placeholder="First Name"
            placeholderTextColor="#999"
            style={styles.input}
          />

          <TextInput
            placeholder="Last Name"
            placeholderTextColor="#999"
            style={styles.input}
          />

          <TextInput
            placeholder="Email Address"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry
            style={styles.input}
          />

          <Text style={styles.terms}>
            Agree with{' '}
            <Text style={styles.link}>
              Terms and Conditions
            </Text>
          </Text>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>
              SIGN UP
            </Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            Already have an account?{' '}
            <Text
              style={styles.link}
              onPress={() =>
                router.replace('/(auth)/login')
              }
            >
              Login
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
    marginTop: 50,
  },

  title: {
    fontSize: 48,
    marginTop: 12,
    color: Colors.navy,
    fontFamily: 'serif',
  },

  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#C5CED9',
    marginTop: 24,
    paddingBottom: 14,
  },

  activeTab: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.navy,
  },

  inactiveTab: {
    fontSize: 18,
    color: '#888',
  },

  form: {
    marginTop: 32,
  },

  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  terms: {
    textAlign: 'center',
    marginTop: 4,
    color: '#333',
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
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#CFE8F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  inner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },

  bar: {
    width: 8,
    backgroundColor: '#FFF',
    borderRadius: 4,
  },
});