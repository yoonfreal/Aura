
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

// Returns a label for the challenge unit, e.g. "Basketball session" for "SESSIONS".
export function challengeUnitLabel(goalUnit: string, sport: string | null): string {
  const unit = goalUnit.trim().toUpperCase();
  if (unit === 'SESSIONS') return `${sportLabel(sport).toLowerCase()} session`;
  if (unit === 'KM') return 'km';
  return goalUnit;
}

export function isSportChallenge(goalUnit: string, sport: string | null): boolean {
  return goalUnit.trim().toUpperCase() === 'SESSIONS' && !!sport;
}
