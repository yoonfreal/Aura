import { supabase } from '@/lib/supabase';

export type NotificationPreferences = {
  pushEnabled: boolean;
  friendRequests: boolean;
  reactions: boolean;
  comments: boolean;
  challengeInvites: boolean;
  challengeAccepted: boolean;
  challengeEndingSoon: boolean;
  streakReminder: boolean;
};

// A user who has never opened the settings screen has no row yet — treat that as
// everything on, matching the toggles' existing default-true behavior.
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  friendRequests: true,
  reactions: true,
  comments: true,
  challengeInvites: true,
  challengeAccepted: true,
  challengeEndingSoon: true,
  streakReminder: true,
};
// for notification_preferences table
type PreferencesRow = {
  push_enabled: boolean;
  friend_requests: boolean;
  reactions: boolean;
  comments: boolean;
  challenge_invites: boolean;
  challenge_accepted: boolean;
  challenge_ending_soon: boolean;
  streak_reminder: boolean;
};

function fromRow(row: PreferencesRow): NotificationPreferences {
  return {
    pushEnabled: row.push_enabled,
    friendRequests: row.friend_requests,
    reactions: row.reactions,
    comments: row.comments,
    challengeInvites: row.challenge_invites,
    challengeAccepted: row.challenge_accepted,
    challengeEndingSoon: row.challenge_ending_soon,
    streakReminder: row.streak_reminder,
  };
}

export async function fetchNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select(
      'push_enabled, friend_requests, reactions, comments, challenge_invites, challenge_accepted, challenge_ending_soon, streak_reminder'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return DEFAULT_NOTIFICATION_PREFERENCES;

  return fromRow(data as PreferencesRow);
}

export async function updateNotificationPreference(
  userId: string,
  //the settings that changed, not all of them.
  patch: Partial<PreferencesRow>
): Promise<void> {
  const { error } = await supabase
    .from('notification_preferences')

    //update + insert
    .upsert(
      {
        user_id: userId,
        ...patch,
        updated_at: new Date().toISOString(),
      },

      //if a row with this user_id already exists, update that one instead of making a second row
      { onConflict: 'user_id' }
    );

  if (error) throw error;
}

export async function isNotificationTypeEnabled(
  userId: string,
  key: keyof Omit<NotificationPreferences, 'pushEnabled'>
): Promise<boolean> {
  const prefs = await fetchNotificationPreferences(userId);
  return prefs.pushEnabled && prefs[key];
}
