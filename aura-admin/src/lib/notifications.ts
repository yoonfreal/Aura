import { supabase } from './supabase';

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
