import { Platform } from 'react-native';
import {
  isHealthDataAvailable,
  requestAuthorization,
  queryStatisticsForQuantity,
  type QuantityTypeIdentifier,
} from '@kingstinct/react-native-healthkit';
import type { DailyStats, WatchSyncStatus } from '@/types';

const READ_TYPES: readonly QuantityTypeIdentifier[] = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function requestHealthKitPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !isHealthDataAvailable()) return false;
  return requestAuthorization({ toRead: READ_TYPES });
}

async function sumSince(
  identifier: 'HKQuantityTypeIdentifierStepCount' | 'HKQuantityTypeIdentifierActiveEnergyBurned',
  unit: 'count' | 'kcal',
  startDate: Date,
): Promise<number> {
  const result = await queryStatisticsForQuantity(identifier, ['cumulativeSum'], {
    unit,
    filter: { date: { startDate, endDate: new Date() } },
  });
  return result.sumQuantity?.quantity ?? 0;
}

export async function fetchTodayStats(): Promise<DailyStats> {
  if (Platform.OS !== 'ios') {
    return { steps: 0, calories: 0, streakDays: 0, xpEarned: 0 };
  }

  const today = startOfToday();
  const [steps, calories] = await Promise.all([
    sumSince('HKQuantityTypeIdentifierStepCount', 'count', today),
    sumSince('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal', today),
  ]);

  return {
    steps: Math.round(steps),
    calories: Math.round(calories),
    streakDays: 0,
    xpEarned: 0,
  };
}

// Approximates "watch sync" from whether HealthKit has recorded any steps in the last
// hour — this library has no direct "last synced at" API, so this is a proxy: recent
// step data means a watch/phone is actively reporting to HealthKit right now.
export async function fetchWatchSyncStatus(): Promise<WatchSyncStatus> {
  if (Platform.OS !== 'ios') {
    return { connected: false, lastSyncMinutesAgo: 0 };
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentSteps = await sumSince('HKQuantityTypeIdentifierStepCount', 'count', hourAgo);

  return recentSteps > 0
    ? { connected: true, lastSyncMinutesAgo: 0 }
    : { connected: false, lastSyncMinutesAgo: 60 };
}
