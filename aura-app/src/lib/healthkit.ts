import type { DailyStats, WatchSyncStatus } from '@/types';

// Stub — returns mock data until react-native-health + EAS Build is configured.
// Real flow: Apple Watch → HealthKit → react-native-health → Express backend → Supabase

export async function requestHealthKitPermissions(): Promise<boolean> {
  // TODO: replace with AppleHealthKit.initHealthKit() after EAS Build setup
  return false;
}

export async function fetchTodayStats(): Promise<DailyStats> {
  // TODO: replace with real AppleHealthKit reads
  return {
    steps: 5120,
    calories: 153,
    streakDays: 12,
    xpEarned: 50,
  };
}

export async function fetchWatchSyncStatus(): Promise<WatchSyncStatus> {
  // TODO: derive from latest HealthKit sample timestamp
  return {
    connected: true,
    lastSyncMinutesAgo: 2,
  };
}
