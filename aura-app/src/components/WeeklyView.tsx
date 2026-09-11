import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatCard } from '@/components/StatCard';
import type { WeeklyBarDay, WeeklyStats } from '@/types';

const BAR_MAX_HEIGHT = 100;
const EMPTY_BARS: WeeklyBarDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
  day,
  date: '',
  xp: 0,
  steps: 0,
  calories: 0,
}));

function formatBarDate(date: string): string | null {
  if (!date) return null;
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function fmtChange(value: number | null, unit: 'percent' | 'absolute'): string | undefined {
  if (value === null) return undefined;
  const sign = value >= 0 ? '+' : '';
  return unit === 'percent' ? `${sign}${value}% vs last week` : `${sign}${value} vs last week`;
}

interface Props {
  stats: WeeklyStats | null;
}

export function WeeklyView({ stats }: Props) {
  const barData = stats?.barData ?? EMPTY_BARS;
  const maxSteps = Math.max(...barData.map((b) => b.steps), 1);
  const [selectedDay, setSelectedDay] = useState<WeeklyBarDay | null>(null);

  if (!stats) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1B2B4B" />
      </View>
    );
  }

  return (
    <>
      {/* Stats Grid — identical layout to Daily */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            icon="footsteps"
            iconColor="#0D9488"
            iconBg="#CCFBF1"
            value={stats.avgSteps.toLocaleString()}
            label="Avg daily steps"
            sub={fmtChange(stats.avgStepsVsLastWeek, 'percent')}
          />
          <StatCard
            icon="barbell"
            iconColor="#EA580C"
            iconBg="#FFEDD5"
            value={stats.totalCalories.toLocaleString()}
            label="Calories"
            sub={fmtChange(stats.caloriesVsLastWeek, 'percent')}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="location"
            iconColor="#DC2626"
            iconBg="#FEE2E2"
            value={stats.estimatedKm.toString()}
            label="Km"
          />
          <StatCard
            icon="trophy"
            iconColor="#D97706"
            iconBg="#FEF3C7"
            value={stats.totalXp.toString()}
            label="XP earned"
            sub={fmtChange(stats.xpVsLastWeek, 'absolute')}
          />
        </View>
      </View>

      {/* Weekly Progress */}
      <Text style={styles.sectionTitle}>WEEKLY PROGRESS</Text>
      <View style={styles.chartCard}>
        <View style={styles.barsContainer}>
          {barData.map((bar) => {
            const isSelected = selectedDay?.day === bar.day;
            return (
              <TouchableOpacity
                key={bar.day}
                style={styles.barColumn}
                activeOpacity={0.7}
                onPress={() => setSelectedDay((prev) => (prev?.day === bar.day ? null : bar))}
              >
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        // Square-root scale, not linear — a single big day (e.g. a long hike)
                        // would otherwise flatten every other day's bar to nearly nothing.
                        height: BAR_MAX_HEIGHT * (Math.sqrt(bar.steps) / Math.sqrt(maxSteps)),
                        backgroundColor: isSelected ? '#F5B800' : bar.steps === maxSteps && bar.steps > 0 ? '#1B2B4B' : '#B8CCE4',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barDay, isSelected && styles.barDaySelected]}>{bar.day}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedDay && (
          <View style={styles.selectedDayCard}>
            <Text style={styles.selectedDayTitle}>
              {selectedDay.day}
              {formatBarDate(selectedDay.date) ? ` · ${formatBarDate(selectedDay.date)}` : ''}
            </Text>
            <View style={styles.selectedDayRow}>
              <Text style={styles.selectedDayLabel}>Steps</Text>
              <Text style={styles.selectedDayValue}>{selectedDay.steps.toLocaleString()}</Text>
            </View>
            <View style={styles.selectedDayRow}>
              <Text style={styles.selectedDayLabel}>Calories burned</Text>
              <Text style={styles.selectedDayValue}>{selectedDay.calories.toLocaleString()} cal</Text>
            </View>
            <View style={styles.selectedDayRow}>
              <Text style={styles.selectedDayLabel}>XP earned</Text>
              <Text style={styles.selectedDayValue}>{selectedDay.xp} XP</Text>
            </View>
          </View>
        )}

        {/* Fitness Breakdown */}
        <View style={styles.breakdown}>
          <Text style={styles.breakdownTitle}>Fitness Breakdown</Text>
          {[
            { label: 'XP earned', value: `${stats.totalXp} XP` },
            { label: 'Calories burned', value: `${stats.totalCalories.toLocaleString()} cal` },
            { label: 'Steps count', value: `${stats.avgSteps.toLocaleString()} avg/day` },
            { label: 'Distance', value: `${stats.estimatedKm} km` },
          ].map((row) => (
            <View key={row.label} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{row.label}</Text>
              <Text style={styles.breakdownValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* AI Weekly Summary */}
      <TouchableOpacity
        style={styles.aiCard}
        activeOpacity={0.85}
        onPress={() => router.push('/ai-report-card')}
      >
        <View style={styles.aiHeader}>
          <Ionicons name="hardware-chip-outline" size={20} color="#FFFFFF" />
          <Text style={styles.aiTitle}>AI weekly summary</Text>
        </View>
        <Text style={styles.aiBody}>
          {`"This week you walked ${stats.avgSteps.toLocaleString()} steps on average per day${stats.avgStepsVsLastWeek !== null ? ` – ${stats.avgStepsVsLastWeek >= 0 ? 'up' : 'down'} ${Math.abs(stats.avgStepsVsLastWeek)}% from last week` : ''}. You earned ${stats.totalXp} XP this week. Keep pushing to level up!"`}
        </Text>
        <View style={styles.aiArrow}>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: 60,
    alignItems: 'center',
  },
  statsGrid: {
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 10,
    gap: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 0,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 14,
  },

  chartCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  barsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    height: BAR_MAX_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 22,
    borderRadius: 6,
  },
  barDay: {
    fontSize: 10,
    color: '#8A9BB0',
    fontWeight: '500',
    marginTop: 6,
  },
  barDaySelected: {
    color: '#1B2B4B',
    fontWeight: '800',
  },

  selectedDayCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  selectedDayTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1B2B4B',
    marginBottom: 2,
  },
  selectedDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedDayLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedDayValue: {
    fontSize: 12,
    color: '#1B2B4B',
    fontWeight: '700',
  },

  breakdown: {
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
    paddingTop: 14,
    gap: 10,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 13,
    color: '#1B2B4B',
    fontWeight: '700',
  },

  aiCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#1B2B4B',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiBody: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 20,
    fontWeight: '400',
  },
  aiArrow: {
    alignSelf: 'flex-end',
    marginTop: 14,
  },
});
