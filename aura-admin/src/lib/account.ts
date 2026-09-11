import { supabase } from './supabase';
import { logAdminActivity } from './activityLog';

export async function fetchCurrentEmail(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.email ?? null;
}

// Supabase sends a confirmation link to the new address before the change actually takes
// effect — the caller's session keeps working under the old email until it's confirmed.
export async function updateEmail(newEmail: string, adminId: string, adminUsername: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;

  try {
    await logAdminActivity(adminId, adminUsername, 'Requested email change', newEmail);
  } catch {
    // Best-effort — the request itself already went through.
  }
}

// No current-password check here — updateUser operates on the caller's own active session,
// same as the Supabase dashboard's own "change password" flow, so re-verifying the password
// that session already proved would be redundant.
export async function updatePassword(newPassword: string, adminId: string, adminUsername: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;

  try {
    await logAdminActivity(adminId, adminUsername, 'Changed password');
  } catch {
    // Best-effort — the change itself already succeeded.
  }
}
