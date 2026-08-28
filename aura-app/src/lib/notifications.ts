import { supabase } from '@/lib/supabase';

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
  userId: string
): Promise<number> {
  const { count, error } =
    await supabase
      .from('notifications')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('user_id', userId)
      .eq('read', false);

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
  | 'team_invite';

export type AppNotification = {
  id: string;
  type: NotificationType;
  actorName: string;
  postId: string | null;
  challengeId: string | null;
  previewText: string | null;
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
        'id, type, actor_id, post_id, challenge_id, read, created_at, post_comments(body), posts(type, caption, achievement_title), challenges(title)'
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

      actorName:
        displayName(
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
          : r.type === 'challenge_complete'
          ? challenge?.title ?? null
          : postPreview(post),

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