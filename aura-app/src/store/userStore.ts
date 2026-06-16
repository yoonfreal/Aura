import { create } from 'zustand';
import type { User, DailyStats, Mission, WatchSyncStatus } from '@/types';
import { defaultMissions } from '@/data/missions';

interface UserStore {
  user: User | null;
  dailyStats: DailyStats;
  missions: Mission[];
  watchSync: WatchSyncStatus;
  activeTab: 'Daily' | 'Weekly';

  setUser: (user: User) => void;
  setDailyStats: (stats: DailyStats) => void;
  setMissions: (missions: Mission[]) => void;
  setWatchSync: (status: WatchSyncStatus) => void;
  setActiveTab: (tab: 'Daily' | 'Weekly') => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: {
    id: '1',
    email: 'jane@student.au.edu',
    username: 'Jane R.',
    xp: 3420,
    level: 8,
    streak: 12,
    xpForNextLevel: 5000,
  },
  dailyStats: {
    steps: 5120,
    calories: 153,
    streakDays: 12,
    xpEarned: 50,
  },
  missions: defaultMissions,
  watchSync: {
    connected: true,
    lastSyncMinutesAgo: 2,
  },
  activeTab: 'Daily',

  setUser: (user) => set({ user }),
  setDailyStats: (dailyStats) => set({ dailyStats }),
  setMissions: (missions) => set({ missions }),
  setWatchSync: (watchSync) => set({ watchSync }),
  setActiveTab: (activeTab) => set({ activeTab }),
}));
