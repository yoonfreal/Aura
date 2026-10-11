// Sports students can log with a live photo. Keep in sync with aura-app/src/constants/sports.ts
// and the validate-workout / generate-daily-missions Edge Functions.
export const SPORTS = [
  { value: 'basketball', label: 'Basketball' },
  { value: 'football', label: 'Football' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'volleyball', label: 'Volleyball' },
  { value: 'table_tennis', label: 'Table Tennis' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'jump_rope', label: 'Jump Rope' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'gym', label: 'Gym Workout' },
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
] as const;
