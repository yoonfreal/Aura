export function getLevelTitle(level: number): string {
  if (level < 5) return 'Beginner';
  if (level < 10) return 'Rookie';
  if (level < 20) return 'Warrior';
  if (level < 30) return 'Athlete';
  if (level < 40) return 'Elite';
  return 'Legend';
}

// XP to reach level N = 80 × N^1.3
export function xpForLevel(level: number): number {
  return Math.round(80 * Math.pow(level, 1.3));
}
