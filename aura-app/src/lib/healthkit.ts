import { Platform } from 'react-native';
import {
  isHealthDataAvailable, //does this phone have Apple Health?
  requestAuthorization, //ask the student for permission to read their health data.
  queryStatisticsForQuantity, //get one total (e.g. all steps since midnight).
  queryStatisticsCollectionForQuantity, //get totals day by day (steps on Mon, Tue, Wed…).
  type QuantityTypeIdentifier, //the list of official names
} from '@kingstinct/react-native-healthkit';
import { startOfThailandDay, thailandDateISO } from '@/lib/thailandTime';
import type { DailyStats } from '@/types';

const READ_TYPES: readonly QuantityTypeIdentifier[] = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
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
  identifier:
    | 'HKQuantityTypeIdentifierStepCount'
    | 'HKQuantityTypeIdentifierActiveEnergyBurned'
    | 'HKQuantityTypeIdentifierDistanceWalkingRunning',
  unit: 'count' | 'kcal' | 'm',
  startDate: Date,
): Promise<number> {
  const result = await queryStatisticsForQuantity(identifier, ['cumulativeSum'], {
    unit,
    filter: { date: { startDate, endDate: new Date() } }, //means only count records from startDate until now
  });
  return result.sumQuantity?.quantity ?? 0;
}
//Example: sumSince('HKQuantityTypeIdentifierStepCount', 'count', midnight) → 6,240 steps today.

export async function fetchTodayStats(): Promise<DailyStats> {
  if (Platform.OS !== 'ios') {
    return { steps: 0, calories: 0, streakDays: 0, xpEarned: 0 };
  }

  const today = startOfToday();
  const [steps, calories, meters] = await Promise.all([
    sumSince('HKQuantityTypeIdentifierStepCount', 'count', today),
    sumSince('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal', today),
    sumSince('HKQuantityTypeIdentifierDistanceWalkingRunning', 'm', today),
  ]);

  return {
    steps: Math.round(steps),
    // Unrounded so the Daily card can match Apple Health exactly (e.g. 0.59 kcal).
    calories,
    streakDays: 0,
    xpEarned: 0,
    distanceKm: Math.round(meters / 100) / 10,
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
    if (b.startDate) sums.set(thailandDateISO(b.startDate), b.sumQuantity?.quantity ?? 0);
  }
  return sums;
}

//uses for weekly charts
//sumSince gives one number. fetchDailyHealthTotals gives one number for each day.
export async function fetchDailyHealthTotals(startISO: string): Promise<DailyHealthTotals | null> {
  if (Platform.OS !== 'ios' || !isHealthDataAvailable()) return null;

  const start = startOfThailandDay(startISO);
  const [steps, calories] = await Promise.all([
    dailySums('HKQuantityTypeIdentifierStepCount', 'count', start),
    dailySums('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal', start),
  ]);

  const totals: DailyHealthTotals = new Map();

  //this merges the two tables into one:
  //steps.keys() is all the dates in the steps table
  for (const date of new Set([...steps.keys(), ...calories.keys()])) {
    totals.set(date, { steps: steps.get(date) ?? 0, calories: calories.get(date) ?? 0 });
  }
  return totals;
}
