import { supabase } from './supabase';

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
