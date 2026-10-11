// Sports students can log with a live photo. `value` is what's stored in challenges.sport,
// missions.sport and workout_logs.sport; keep it in sync with the admin console's list and
// the generate-daily-missions / validate-workout Edge Functions.
export const SPORTS = [
  { value: 'basketball', label: 'Basketball', emoji: '🏀' },
  { value: 'football', label: 'Football', emoji: '⚽' },
  { value: 'badminton', label: 'Badminton', emoji: '🏸' },
  { value: 'volleyball', label: 'Volleyball', emoji: '🏐' },
  { value: 'table_tennis', label: 'Table Tennis', emoji: '🏓' },
  { value: 'tennis', label: 'Tennis', emoji: '🎾' },
  { value: 'swimming', label: 'Swimming', emoji: '🏊' },
  { value: 'jump_rope', label: 'Jump Rope', emoji: '🪢' },
  { value: 'yoga', label: 'Yoga', emoji: '🧘' },
  { value: 'gym', label: 'Gym Workout', emoji: '🏋️' },
  { value: 'running', label: 'Running', emoji: '🏃' },
  { value: 'cycling', label: 'Cycling', emoji: '🚴' },
] as const;

export type SportValue = (typeof SPORTS)[number]['value'];

export function sportLabel(value: string | null | undefined): string {
  return SPORTS.find((s) => s.value === value)?.label ?? 'Sport';
}

// How a challenge's goal unit reads on cards: "basketball sessions" rather than "SESSIONS",
// "km" for distance, and the stored unit for everything else.
export function challengeUnitLabel(goalUnit: string, sport: string | null): string {
  const unit = goalUnit.trim().toUpperCase();
  if (unit === 'SESSIONS') return `${sportLabel(sport).toLowerCase()} session`;
  if (unit === 'KM') return 'km';
  return goalUnit;
}

export function isSportChallenge(goalUnit: string, sport: string | null): boolean {
  return goalUnit.trim().toUpperCase() === 'SESSIONS' && !!sport;
}
