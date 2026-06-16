import { StyleSheet, Text, View } from 'react-native';
import type { WatchSyncStatus } from '@/types';

interface Props {
  status: WatchSyncStatus;
}

export function WatchSyncCard({ status }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Text style={styles.watchIcon}>⌚</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Apple Watch synced</Text>
        <Text style={styles.subtitle}>
          Last sync · {status.lastSyncMinutesAgo} min ago
        </Text>
      </View>
      <View style={[styles.dot, { backgroundColor: status.connected ? '#22C55E' : '#EF4444' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  watchIcon: {
    fontSize: 22,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  subtitle: {
    fontSize: 12,
    color: '#8A9BB0',
    marginTop: 2,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
