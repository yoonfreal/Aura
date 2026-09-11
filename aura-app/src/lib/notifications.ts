import { supabase } from '@/lib/supabase';
import { isNotificationTypeEnabled } from '@/lib/notificationPreferences';
import { startOfThailandDay } from '@/lib/thailandTime';

type ProfileNameRow = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
};

function displayName(
  p: ProfileNameRow | undefined
): string {
  if (!p) return 'Unknown';

  return (
    p.username ||
    `${p.first_name ?? ''} ${
      p.last_name ?? ''
    }`.trim() ||
    'Unknown'
  );
}

async function fetchAcceptedFriendIds(
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('friendships')
    .select(
      'requester_id, addressee_id'
    )
    .eq('status', 'accepted')
    .or(
      `requester_id.eq.${userId},addressee_id.eq.${userId}`
    );

  return (
    (data ?? []) as {
      requester_id: string;
      addressee_id: string;
    }[]
  ).map((f) =>
    f.requester_id === userId
      ? f.addressee_id
      : f.requester_id
  );
}


/* =========================================================
   COMMENT NOTIFICATION
========================================================= */

export async function notifyComment(
  recipientId: string,
  actorId: string,
  postId: string,
  commentId: string
): Promise<void> {
  if (recipientId === actorId) return;
  if (!(await isNotificationTypeEnabled(recipientId, 'comments'))) return;

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: recipientId,
      actor_id: actorId,
      type: 'comment',
      post_id: postId,
      comment_id: commentId,
    });

  if (error) throw error;
}


/* =========================================================
   REACTION NOTIFICATION
========================================================= */

export async function notifyReaction(
  recipientId: string,
  actorId: string,
  postId: string,
  reaction: 'like' | 'fire'
): Promise<void> {
  // Never notify yourself.
  if (recipientId === actorId) return;
  if (!(await isNotificationTypeEnabled(recipientId, 'reactions'))) return;

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: recipientId,
      actor_id: actorId,
      type: 'reaction',
      post_id: postId,
      comment_id: null,
    });

  if (error) throw error;
}


/* =========================================================
   CHALLENGE INVITE NOTIFICATIONS (1v1 + team)
========================================================= */

export async function notifyChallengeInvite(
  recipientId: string,
  actorId: string,
  challengeId: string
): Promise<void> {
  if (recipientId === actorId) return;
  if (!(await isNotificationTypeEnabled(recipientId, 'challengeInvites'))) return;

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: recipientId,
      actor_id: actorId,
      type: 'challenge_invite',
      challenge_id: challengeId,
      post_id: null,
      comment_id: null,
    });

  if (error) throw error;
}

export async function notifyTeamInvite(
  recipientId: string,
  actorId: string,
  challengeId: string
): Promise<void> {
  if (recipientId === actorId) return;
  if (!(await isNotificationTypeEnabled(recipientId, 'challengeInvites'))) return;

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: recipientId,
      actor_id: actorId,
      type: 'team_invite',
      challenge_id: challengeId,
      post_id: null,
      comment_id: null,
    });

  if (error) throw error;
}


/* =========================================================
   CHALLENGE RESPONSE NOTIFICATION (accept + decline)
========================================================= */

// Tells the inviter whether their 1v1/team invite was accepted or declined — declines in
// particular have no other way to surface, since a declined row never shows up as a new
// teammate or opponent anywhere else in the app. Stays on the single 'challenge_response'
// type (rather than two distinct types) because the DB's notifications_type_check
// constraint only whitelists a fixed set of values and doesn't know about new ones —
// accept vs. decline is instead encoded in `message`, the same free-text column
// admin_warning already uses, which isn't constrained.
export async function notifyChallengeResponse(
  recipientId: string,
  actorId: string,
  challengeId: string,
  accepted: boolean
): Promise<void> {
  if (recipientId === actorId) return;
  if (!(await isNotificationTypeEnabled(recipientId, 'challengeAccepted'))) return;

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: recipientId,
      actor_id: actorId,
      type: 'challenge_response',
      challenge_id: challengeId,
      message: accepted ? 'accepted' : 'declined',
      post_id: null,
      comment_id: null,
    });

  if (error) throw error;
}

// Tells the team's founder someone new joined — whether by browsing open teams and
// tapping Join, or by accepting an invite from a teammate other than the founder (an
// invite accepted from the founder themself is covered by notifyChallengeResponse
// instead, so this is skipped for that case to avoid notifying them twice for one event).
// Shares 'challenge_response''s type for the same DB-constraint reason (see above);
// message: 'joined' distinguishes it from an accept/decline.
export async function notifyTeamMemberJoined(
  founderId: string,
  actorId: string,
  challengeId: string
): Promise<void> {
  if (founderId === actorId) return;
  if (!(await isNotificationTypeEnabled(founderId, 'challengeAccepted'))) return;

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: founderId,
      actor_id: actorId,
      type: 'challenge_response',
      challenge_id: challengeId,
      message: 'joined',
      post_id: null,
      comment_id: null,
    });

  if (error) throw error;
}


/* =========================================================
   CHALLENGE COMPLETE NOTIFICATION
========================================================= */

// Self-notification: actor and recipient are the same person. RLS's insert policy only
// requires actor_id = auth.uid(), so a user creating a notification for themselves is
// allowed the same way notifyReaction/notifyComment let a user create one for someone else.
export async function notifyChallengeComplete(
  userId: string,
  challengeId: string
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      actor_id: userId,
      type: 'challenge_complete',
      challenge_id: challengeId,
      post_id: null,
      comment_id: null,
    });

  if (error) throw error;
}


/* =========================================================
   CHALLENGE ENDING SOON NOTIFICATION
========================================================= */

// Self-notification, same shape as notifyChallengeComplete. Deduped by checking for an
// existing row for this user+challenge first, since there's no dedup column and this can
// be called on every app open while the challenge is inside the "ending soon" window.
export async function notifyChallengeEndingSoon(
  userId: string,
  challengeId: string
): Promise<void> {
  if (!(await isNotificationTypeEnabled(userId, 'challengeEndingSoon'))) return;

  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'challenge_ending_soon')
    .eq('challenge_id', challengeId)
    .limit(1);

  if (existing && existing.length > 0) return;

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      actor_id: userId,
      type: 'challenge_ending_soon',
      challenge_id: challengeId,
      post_id: null,
      comment_id: null,
    });

  if (error) throw error;
}


/* =========================================================
   STREAK REMINDER NOTIFICATION
========================================================= */

// Self-notification, once per Thailand-calendar day: dedup by checking for an existing row
// created since midnight Thailand time, since there's no dedup column to key off directly.
export async function notifyStreakReminder(
  userId: string
): Promise<void> {
  if (!(await isNotificationTypeEnabled(userId, 'streakReminder'))) return;

  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'streak_reminder')
    .gte('created_at', startOfThailandDay().toISOString())
    .limit(1);

  if (existing && existing.length > 0) return;

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      actor_id: userId,
      type: 'streak_reminder',
      challenge_id: null,
      post_id: null,
      comment_id: null,
    });

  if (error) throw error;
}


/* =========================================================
   POST NOTIFICATION
========================================================= */

export async function notifyFriendsOfPost(
  actorId: string,
  postId: string
): Promise<void> {
  const friendIds =
    await fetchAcceptedFriendIds(
      actorId
    );

  if (friendIds.length === 0) return;

  const { error } =
    await supabase
      .from('notifications')
      .insert(
        friendIds.map(
          (friendId) => ({
            user_id: friendId,
            actor_id: actorId,
            type: 'post',
            post_id: postId,
            comment_id: null,
          })
        )
      );

  if (error) throw error;
}


/* =========================================================
   UNREAD COUNT
========================================================= */

export async function countUnreadNotifications(
  userId: string,
  types?: NotificationType[]
): Promise<number> {
  let query = supabase
    .from('notifications')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('user_id', userId)
    .eq('read', false);

  if (types) {
    query = query.in('type', types);
  }

  const { count, error } = await query;

  if (error) throw error;

  return count ?? 0;
}


/* =========================================================
   TYPES
========================================================= */

export type NotificationType =
  | 'comment'
  | 'post'
  | 'reaction'
  | 'friend_request'
  | 'challenge_invite'
  | 'challenge_response'
  | 'challenge_complete'
  | 'challenge_ending_soon'
  | 'streak_reminder'
  | 'team_invite'
  | 'admin_warning'
  | 'announcement';

// Every type that should take a tap to the challenge it's about, rather than a post (or
// nowhere). Shared by every screen's notification handler so the list can't drift between
// them the way four separately-maintained copies would.
const CHALLENGE_LINKED_TYPES: NotificationType[] = [
  'challenge_invite',
  'team_invite',
  'challenge_response',
  'challenge_complete',
];

export function notificationLinksToChallenge(type: NotificationType): boolean {
  return CHALLENGE_LINKED_TYPES.includes(type);
}

// The types that belong to the Social tab's world (friend activity on posts/friendships)
// as opposed to challenge/system notifications — used to scope the Social tab's badge
// dot to only what's actually social, separately from the shared all-types unread count
// the bell icons on every tab use.
export const SOCIAL_NOTIFICATION_TYPES: NotificationType[] = [
  'comment',
  'post',
  'reaction',
  'friend_request',
];

export type AppNotification = {
  id: string;
  type: NotificationType;
  actorName: string;
  postId: string | null;
  challengeId: string | null;
  previewText: string | null;
  // Only meaningful for type 'challenge_response' — read off the `message` column to
  // tell an accept, a decline, and a new team member joining apart, null otherwise.
  responseStatus: 'accepted' | 'declined' | 'joined' | null;
  createdAt: string;
  read: boolean;
};


/* =========================================================
   DATABASE ROW
========================================================= */

type NotificationRow = {
  id: string;
  type: NotificationType;
  actor_id: string;
  post_id: string | null;
  challenge_id: string | null;
  message: string | null;
  read: boolean;
  created_at: string;

  post_comments:
    | { body: string }
    | { body: string }[]
    | null;

  posts:
    | {
        type: string;
        caption: string | null;
        achievement_title: string | null;
      }
    | {
        type: string;
        caption: string | null;
        achievement_title: string | null;
      }[]
    | null;

  challenges:
    | { title: string }
    | { title: string }[]
    | null;
};


/* =========================================================
   POST PREVIEW
========================================================= */

function postPreview(
  post:
    | {
        type: string;
        caption: string | null;
        achievement_title: string | null;
      }
    | null
    | undefined
): string | null {
  if (!post) return null;

  if (post.caption) {
    return post.caption;
  }

  if (post.achievement_title) {
    return post.achievement_title;
  }

  if (
    post.type === 'partner'
  ) {
    return 'is looking for a partner';
  }

  return null;
}


/* =========================================================
   FETCH NOTIFICATIONS
========================================================= */

export async function fetchNotifications(
  userId: string,
  limit = 30
): Promise<AppNotification[]> {
  const { data, error } =
    await supabase
      .from('notifications')
      .select(
        'id, type, actor_id, post_id, challenge_id, message, read, created_at, post_comments(body), posts(type, caption, achievement_title), challenges(title)'
      )
      .eq('user_id', userId)
      .order('created_at', {
        ascending: false,
      })
      .limit(limit);

  if (error) throw error;

  const rows =
    (data ?? []) as NotificationRow[];

  const actorIds = [
    ...new Set(
      rows.map(
        (r) => r.actor_id
      )
    ),
  ];

  const { data: profilesData } =
    actorIds.length
      ? await supabase
          .from('profiles')
          .select(
            'id, username, first_name, last_name'
          )
          .in(
            'id',
            actorIds
          )
      : {
          data: [] as ProfileNameRow[],
        };

  const profileById =
    new Map(
      (
        (profilesData ??
          []) as ProfileNameRow[]
      ).map((p) => [
        p.id,
        p,
      ])
    );

  return rows.map((r) => {
    const comment =
      Array.isArray(
        r.post_comments
      )
        ? r.post_comments[0]
        : r.post_comments;

    const post =
      Array.isArray(r.posts)
        ? r.posts[0]
        : r.posts;

    const challenge =
      Array.isArray(r.challenges)
        ? r.challenges[0]
        : r.challenges;

    return {
      id: r.id,

      type: r.type,

      // Warnings and announcements come from an admin acting on behalf of the platform, not
      // a specific person — never surface which admin's account sent it.
      actorName:
        r.type === 'admin_warning' || r.type === 'announcement'
          ? 'Admin'
          : displayName(
              profileById.get(
                r.actor_id
              )
            ),

      postId:
        r.post_id,

      challengeId:
        r.challenge_id,

      previewText:
        r.type === 'comment'
          ? comment?.body ??
            null
          : r.type === 'challenge_complete' ||
            r.type === 'challenge_ending_soon' ||
            r.type === 'challenge_invite' ||
            r.type === 'team_invite' ||
            r.type === 'challenge_response'
          ? challenge?.title ?? null
          : r.type === 'admin_warning' || r.type === 'announcement'
          ? r.message ?? null
          : postPreview(post),

      responseStatus:
        r.type === 'challenge_response' &&
        (r.message === 'accepted' || r.message === 'declined' || r.message === 'joined')
          ? r.message
          : null,

      createdAt:
        r.created_at,

      read: r.read,
    };
  });
}


/* =========================================================
   MARK ALL AS READ
========================================================= */

export async function markAllNotificationsRead(
  userId: string
): Promise<void> {
  const { error } =
    await supabase
      .from('notifications')
      .update({
        read: true,
      })
      .eq(
        'user_id',
        userId
      )
      .eq(
        'read',
        false
      );

  if (error) throw error;
}