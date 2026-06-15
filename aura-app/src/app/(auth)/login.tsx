import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-bold" style={{ color: Colors.navy }}>
          Login / Sign Up
        </Text>
        <Text className="mt-2" style={{ color: Colors.navyMid }}>
          Coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.skyBackground,
  },
});
