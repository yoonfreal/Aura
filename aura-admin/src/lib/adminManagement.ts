import { supabase } from './supabase';
import { logAdminActivity } from './activityLog';

export type ManagedUser = {
  id: string;
  username: string;
  role: 'user' | 'admin';
};

type ProfileRoleRow = {
  id: string;
  username: string;
  role: 'user' | 'admin' | null;
};

// Capped at 10 — this is a "find the one person you're looking for" search box, not a full
// user browser (User Management already covers that).
export async function searchUsersByUsername(query: string): Promise<ManagedUser[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, role')
    .ilike('username', `%${trimmed}%`)
    .order('username', { ascending: true })
    .limit(10);
  if (error) throw error;

  return ((data ?? []) as ProfileRoleRow[]).map((row) => ({
    id: row.id,
    username: row.username,
    role: row.role === 'admin' ? 'admin' : 'user',
  }));
}

export async function setUserRole(
  userId: string,
  targetUsername: string,
  role: 'user' | 'admin',
  adminId: string,
  adminUsername: string,
): Promise<void> {
  const { data, error } = await supabase.from('profiles').update({ role }).eq('id', userId).select('id');
  if (error) throw error;
  // Same RLS-silent-no-op gap as every other profiles write in this app — surface it instead
  // of letting the caller believe the role actually changed.
  if (!data || data.length === 0) {
    throw new Error('Role update did not apply — check the admin update policy on profiles.');
  }

  try {
    await logAdminActivity(adminId, adminUsername, role === 'admin' ? 'Granted admin access' : 'Revoked admin access', targetUsername);
  } catch {
    // Best-effort — the role change itself already succeeded.
  }
}
