import { create } from 'zustand';
import type { User, DailyStats, Mission, WatchSyncStatus, WeeklyStats } from '@/types';

interface UserStore {
  user: User | null;
  dailyStats: DailyStats;
  missions: Mission[];
  watchSync: WatchSyncStatus;
  activeTab: 'Daily' | 'Weekly';
  weeklyStats: WeeklyStats | null;
  claimableCount: number;
  friendRequestCount: number;
  notificationCount: number;

  setUser: (user: User) => void;
  clearUser: () => void;
  setDailyStats: (stats: DailyStats) => void;
  setMissions: (missions: Mission[]) => void;
  setWatchSync: (status: WatchSyncStatus) => void;
  setActiveTab: (tab: 'Daily' | 'Weekly') => void;
  setWeeklyStats: (stats: WeeklyStats) => void;
  setClaimableCount: (count: number) => void;
  setFriendRequestCount: (count: number) => void;
  setNotificationCount: (count: number) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  dailyStats: {
    steps: 0,
    calories: 0,
    streakDays: 0,
    xpEarned: 0,
  },
  missions: [],
  watchSync: {
    connected: false,
    lastSyncMinutesAgo: 0,
  },
  activeTab: 'Daily',
  weeklyStats: null,
  claimableCount: 0,
  friendRequestCount: 0,
  notificationCount: 0,

  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  setDailyStats: (dailyStats) => set({ dailyStats }),
  setMissions: (missions) => set({ missions }),
  setWatchSync: (watchSync) => set({ watchSync }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setWeeklyStats: (weeklyStats) => set({ weeklyStats }),
  setClaimableCount: (claimableCount) => set({ claimableCount }),
  setFriendRequestCount: (friendRequestCount) => set({ friendRequestCount }),
  setNotificationCount: (notificationCount) => set({ notificationCount }),
}));
