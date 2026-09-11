import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { GYM_LOCATION, CHECK_IN_RADIUS_METERS } from '@/constants/gym';
import { thailandDateISO } from '@/lib/thailandTime';

function todayISO(): string {
  return thailandDateISO();
}

// Haversine formula — distance in meters between two lat/lng points.
function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type CheckInResult =
  | { success: true }
  | { success: false; reason: 'permission_denied' | 'too_far' | 'already_checked_in' | 'error'; distanceMeters?: number };

export async function checkInToGym(userId: string): Promise<CheckInResult> {
  try {
    const today = todayISO();

    const { data: existing } = await supabase
      .from('gym_checkins')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();
    if (existing) return { success: false, reason: 'already_checked_in' };

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { success: false, reason: 'permission_denied' };

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const distance = distanceMeters(
      { latitude: position.coords.latitude, longitude: position.coords.longitude },
      GYM_LOCATION,
    );

    if (distance > CHECK_IN_RADIUS_METERS) {
      return { success: false, reason: 'too_far', distanceMeters: Math.round(distance) };
    }

    const { error } = await supabase.from('gym_checkins').insert({
      user_id: userId,
      date: today,
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });
    if (error) return { success: false, reason: 'error' };

    return { success: true };
  } catch {
    return { success: false, reason: 'error' };
  }
}

export async function fetchCheckInStatusToday(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('gym_checkins')
    .select('id')
    .eq('user_id', userId)
    .eq('date', todayISO())
    .maybeSingle();
  return !!data;
}

// Returns the check-in dates (YYYY-MM-DD) for the given month, for the calendar view.
export async function fetchCheckInDatesForMonth(userId: string, year: number, month: number): Promise<string[]> {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDate).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('gym_checkins')
    .select('date')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end);
  if (error) throw error;

  return ((data ?? []) as { date: string }[]).map((row) => row.date);
}
