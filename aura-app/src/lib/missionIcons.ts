import type { Ionicons } from '@expo/vector-icons';
import type { MissionType } from '@/types';

// Missions come from a free-form `icon` field seeded in Supabase, but every mission's
// `goal_unit` is one of these 4 fixed types — so we key the modernized vector icon off
// that instead of trying to interpret arbitrary per-row emoji.
export const MISSION_TYPE_ICON: Record<MissionType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  steps: { icon: 'footsteps-outline', color: '#1B2B4B' },
  calories: { icon: 'flame-outline', color: '#F59E0B' },
  minutes: { icon: 'time-outline', color: '#1B2B4B' },
  photo: { icon: 'camera-outline', color: '#1B2B4B' },
};
