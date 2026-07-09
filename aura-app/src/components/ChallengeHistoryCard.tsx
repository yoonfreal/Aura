import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ChallengeHistoryEntry } from '@/lib/challenges';

type ChallengeHistoryCardProps = {
  entry: ChallengeHistoryEntry;
};

export function ChallengeHistoryCard({ entry }: ChallengeHistoryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {entry.challengeIcon} {entry.challengeTitle}
        </Text>
        <View style={[styles.badge, entry.won ? styles.badgeWon : styles.badgeLost]}>
          <MaterialCommunityIcons
            name={entry.won ? 'trophy' : 'trophy-outline'}
            size={12}
            color={entry.won ? '#fff' : '#6B7280'}
          />
          <Text style={[styles.badgeText, entry.won ? styles.badgeTextWon : styles.badgeTextLost]}>
            {entry.won ? 'Won' : 'Lost'}
          </Text>
        </View>
      </View>

      {entry.opponentName && (
        <Text style={styles.subtitle}>
          vs {entry.opponentName} · {entry.finalValue.toLocaleString()}
          {entry.opponentFinalValue !== null ? ` – ${entry.opponentFinalValue.toLocaleString()}` : ''}{' '}
          {entry.goalUnit}
        </Text>
      )}

      {entry.won && (
        <Text style={styles.xpText}>+{entry.xpEarned} XP earned</Text>
      )}

      {entry.won && entry.badgeName && (
        <Text style={styles.badgeEarnedText}>
          {entry.badgeIcon ? `${entry.badgeIcon} ` : ''}
          {entry.badgeName} earned
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#0D1829', flexShrink: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeWon: { backgroundColor: '#16A34A' },
  badgeLost: { backgroundColor: '#F3F4F6' },
  badgeText: { fontWeight: '800', fontSize: 11 },
  badgeTextWon: { color: '#fff' },
  badgeTextLost: { color: '#6B7280' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 8, fontWeight: '600' },
  xpText: { fontSize: 12, color: '#16A34A', marginTop: 6, fontWeight: '800' },
  badgeEarnedText: { fontSize: 12, color: '#8A6D00', marginTop: 4, fontWeight: '800' },
});
