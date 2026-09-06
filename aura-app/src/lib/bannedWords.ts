import { supabase } from './supabase';

// Admin-editable list (see aura-admin's Settings > Moderation > Banned words). Fails open
// (empty list, so nothing gets blocked) if the table isn't reachable — same fail-open
// convention as appSettings.ts, since a network hiccup shouldn't silently break posting.
export async function fetchBannedKeywords(): Promise<string[]> {
  const { data, error } = await supabase.from('banned_keywords').select('word');
  if (error || !data) return [];
  return (data as { word: string }[]).map((row) => row.word.toLowerCase());
}

export function containsBannedKeyword(text: string, keywords: string[]): boolean {
  if (keywords.length === 0) return false;
  const lower = text.toLowerCase();
  return keywords.some((word) => lower.includes(word));
}
