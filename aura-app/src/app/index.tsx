import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function RootIndex() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1B2B4B" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F6F9',
  },
});
