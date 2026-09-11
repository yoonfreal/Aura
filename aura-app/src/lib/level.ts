export function getLevelTitle(level: number): string {
  if (level < 5) return 'Beginner';
  if (level < 10) return 'Rookie';
  if (level < 20) return 'Warrior';
  if (level < 30) return 'Athlete';
  if (level < 40) return 'Elite';
  return 'Legend';
}

// Cumulative XP to reach level N = 80 × (N-1)^1.3.
// Anchored at (N-1) so level 1 starts at exactly 0 XP with no special
// case, and every level's cost is strictly greater than the last.
export function xpForLevel(level: number): number {
  return Math.round(80 * Math.pow(level - 1, 1.3));
}

// Cumulative XP at which `level` began.
export function xpAtLevelStart(level: number): number {
  return xpForLevel(level);
}
