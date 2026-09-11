import { supabase } from './supabase';
import { logAdminActivity } from './activityLog';

// Delivers a warning straight into the user's in-app notifications feed (aura-app renders
// the 'admin_warning' type with this message as its body). Requires the "Admins can send
// notifications to any user" RLS policy on notifications, since the default insert policy
// only allows a user to notify themselves.
export async function sendAdminWarning(userId: string, adminId: string, message: string): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    actor_id: adminId,
    type: 'admin_warning',
    message,
    post_id: null,
    comment_id: null,
    challenge_id: null,
  });
  if (error) throw error;
}

// Broadcasts one message to every user's notifications feed — same table and admin-send
// policy as sendAdminWarning above, just fanned out to every profile instead of one, and
// tagged 'announcement' so aura-app renders it as a neutral broadcast rather than a warning.
export async function sendAnnouncement(adminId: string, adminUsername: string, message: string): Promise<number> {
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id');
  if (profilesError) throw profilesError;

  const recipientIds = ((profiles ?? []) as { id: string }[]).map((p) => p.id);
  if (recipientIds.length === 0) return 0;

  const { error } = await supabase.from('notifications').insert(
    recipientIds.map((userId) => ({
      user_id: userId,
      actor_id: adminId,
      type: 'announcement',
      message,
      post_id: null,
      comment_id: null,
      challenge_id: null,
    })),
  );
  if (error) throw error;

  try {
    await logAdminActivity(adminId, adminUsername, 'Sent announcement', `"${message}" to ${recipientIds.length} users`);
  } catch {
    // Best-effort — the announcement itself already sent.
  }

  return recipientIds.length;
}
