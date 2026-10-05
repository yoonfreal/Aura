import { Platform } from 'react-native';
import {
  isHealthDataAvailable,
  requestAuthorization,
  queryStatisticsForQuantity,
  queryStatisticsCollectionForQuantity,
  type QuantityTypeIdentifier,
} from '@kingstinct/react-native-healthkit';
import { startOfThailandDay, thailandDateISO } from '@/lib/thailandTime';
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

export type DailyHealthTotals = Map<string, { steps: number; calories: number }>;

async function dailySums(
  identifier: 'HKQuantityTypeIdentifierStepCount' | 'HKQuantityTypeIdentifierActiveEnergyBurned',
  unit: 'count' | 'kcal',
  startDate: Date,
): Promise<Map<string, number>> {
  const buckets = await queryStatisticsCollectionForQuantity(identifier, ['cumulativeSum'], startDate, { day: 1 }, {
    unit,
    filter: { date: { startDate, endDate: new Date() } },
  });
  const sums = new Map<string, number>();
  for (const b of buckets) {
    if (b.startDate) sums.set(thailandDateISO(b.startDate), Math.round(b.sumQuantity?.quantity ?? 0));
  }
  return sums;
}

// Per-day step/calorie totals for every Thailand-local day from `startISO` through today,
// read straight from HealthKit. daily_stats only has a row for days the app was opened (and
// only the count as of that last sync), so weekly averages built from it undercount — this
// is the source Apple Health itself uses. Returns null where HealthKit isn't available.
export async function fetchDailyHealthTotals(startISO: string): Promise<DailyHealthTotals | null> {
  if (Platform.OS !== 'ios' || !isHealthDataAvailable()) return null;

  const start = startOfThailandDay(startISO);
  const [steps, calories] = await Promise.all([
    dailySums('HKQuantityTypeIdentifierStepCount', 'count', start),
    dailySums('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal', start),
  ]);

  const totals: DailyHealthTotals = new Map();
  for (const date of new Set([...steps.keys(), ...calories.keys()])) {
    totals.set(date, { steps: steps.get(date) ?? 0, calories: calories.get(date) ?? 0 });
  }
  return totals;
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
