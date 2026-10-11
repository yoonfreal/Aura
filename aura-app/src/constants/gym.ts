// Campus gyms a student can check in at. A check-in is accepted at whichever gym is
// nearest, as long as the student is within CHECK_IN_RADIUS_METERS of it. `id` is stored
// in gym_checkins.gym so admin stats can tell the campuses apart.
export const GYMS = [
  { id: 'suvarnabhumi', name: 'Suvarnabhumi campus gym', latitude: 13.615889, longitude: 100.833631 },
  // 13°45'06.0"N 100°37'40.9"E
  { id: 'hua_mak', name: 'Hua Mak campus gym', latitude: 13.751667, longitude: 100.628028 },
] as const;

export type Gym = (typeof GYMS)[number];

export const CHECK_IN_RADIUS_METERS = 100;
