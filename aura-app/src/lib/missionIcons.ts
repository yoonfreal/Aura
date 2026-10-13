import type { Ionicons } from '@expo/vector-icons';
import type { MissionType } from '@/types';

//Record<MissionType, {...}  means "a table with one row for every MissionType"
export const MISSION_TYPE_ICON: Record<MissionType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  steps: { icon: 'footsteps-outline', color: '#1B2B4B' },
  calories: { icon: 'flame-outline', color: '#F59E0B' },
  minutes: { icon: 'time-outline', color: '#1B2B4B' },
  photo: { icon: 'camera-outline', color: '#1B2B4B' },
};
