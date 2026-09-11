import { supabase } from './supabase';
import { logAdminActivity } from './activityLog';

export type BannedWord = {
  id: string;
  word: string;
};

export async function fetchBannedWords(): Promise<BannedWord[]> {
  const { data, error } = await supabase.from('banned_keywords').select('id, word').order('word', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BannedWord[];
}

export async function addBannedWord(word: string, adminId: string, adminUsername: string): Promise<void> {
  const { error } = await supabase.from('banned_keywords').insert({ word, created_by: adminId });
  if (error) {
    if (error.code === '23505') throw new Error('That word is already in the list.');
    throw error;
  }

  try {
    await logAdminActivity(adminId, adminUsername, 'Added banned word', word);
  } catch {
    // Best-effort — the word was already added successfully.
  }
}

export async function removeBannedWord(id: string, word: string, adminId: string, adminUsername: string): Promise<void> {
  const { error } = await supabase.from('banned_keywords').delete().eq('id', id);
  if (error) throw error;

  try {
    await logAdminActivity(adminId, adminUsername, 'Removed banned word', word);
  } catch {
    // Best-effort — the word was already removed successfully.
  }
}
