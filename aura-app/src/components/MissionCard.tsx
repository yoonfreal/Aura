import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Mission } from '@/types';

interface Props {
  mission: Mission;
  onLog?: (id: string) => void;
}

export function MissionCard({ mission, onLog }: Props) {
  const progress = Math.min(mission.currentValue / mission.goalValue, 1);
  const percentage = Math.round(progress * 100);
  const hasStarted = mission.currentValue > 0;
  const needsPhoto = mission.goalUnit === 'photo';

  function formatProgress() {
    if (mission.goalUnit === 'steps') {
      return `${mission.currentValue.toLocaleString()} / ${mission.goalValue.toLocaleString()} steps`;
    }
    if (mission.goalUnit === 'calories') {
      return `${mission.currentValue} / ${mission.goalValue} calories burned`;
    }
    if (mission.goalUnit === 'minutes') {
      return hasStarted
        ? `${mission.currentValue} / ${mission.goalValue} min`
        : 'Not started · tap to log';
    }
    return needsPhoto ? 'Take live photo to verify' : '';
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{mission.icon}</Text>
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{mission.title}</Text>
            <Text style={styles.xp}>{mission.xpReward} XP</Text>
          </View>
          <Text style={styles.progressText}>{formatProgress()}</Text>
        </View>

        {!mission.completed && !hasStarted && (
          <TouchableOpacity style={styles.logBtn} onPress={() => onLog?.(mission.id)}>
            <Text style={styles.logBtnText}>Log</Text>
          </TouchableOpacity>
        )}

        {(mission.completed || hasStarted) && !mission.completed && (
          <Text style={styles.percentage}>{percentage}%</Text>
        )}

        {mission.completed && (
          <Text style={styles.percentage}>100%</Text>
        )}
      </View>

      {(mission.completed || hasStarted) && (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${percentage}%` as `${number}%` }]} />
        </View>
      )}

      {mission.completed && (
        <Text style={styles.congrats}>
          🎉 Congratulations! you have earned{' '}
          <Text style={styles.congratsXP}>{mission.xpReward}XP</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F2F6F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 22,
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  xp: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  progressText: {
    fontSize: 12,
    color: '#8A9BB0',
    marginTop: 2,
  },
  percentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
    marginLeft: 8,
  },
  logBtn: {
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginLeft: 8,
  },
  logBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  barTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#1B2B4B',
    borderRadius: 3,
  },
  congrats: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 10,
  },
  congratsXP: {
    color: '#16A34A',
    fontWeight: '700',
  },
});
