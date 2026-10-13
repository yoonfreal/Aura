export const GYMS = [
  { id: 'suvarnabhumi', name: 'Suvarnabhumi campus gym', latitude: 13.615889, longitude: 100.833631 },
  
  { id: 'hua_mak', name: 'Hua Mak campus gym', latitude: 13.751667, longitude: 100.628028 },
] as const;

export type Gym = (typeof GYMS)[number];

export const CHECK_IN_RADIUS_METERS = 100;
