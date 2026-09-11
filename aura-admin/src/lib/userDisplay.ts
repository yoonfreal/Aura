// Same palette style as the mobile app's initial-letter avatars (see aura-app's
// friends.tsx CARD_COLORS) — this app has no profile photos, just colored initials.
const AVATAR_COLORS = ['#1E4D8C', '#744210', '#065F46', '#5B21B6', '#831843', '#3D2B1F'];

export function avatarColorFor(username: string): string {
  const sum = Array.from(username).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// Escalating in visual weight to match tier progression, ending in the app's own navy
// for Legend so the top tier stands out rather than just being "another color."
export const TITLE_STYLES: Record<string, string> = {
  Beginner: 'bg-indigo-100 text-indigo-700',
  Rookie: 'bg-rose-100 text-rose-700',
  Warrior: 'bg-orange-100 text-orange-700',
  Athlete: 'bg-purple-100 text-purple-700',
  Elite: 'bg-amber-100 text-amber-700',
  Legend: 'bg-[#1B2B4B] text-white',
};
