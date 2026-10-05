import { supabase } from '@/lib/supabase';

type ProfileNameRow = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
};

function displayName(p: ProfileNameRow | undefined): string {
  if (!p) return 'Unknown';
  return p.username || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown';
}

type ParticipantRow = { conversation_id: string; user_id: string };
type ReadCursorRow = { conversation_id: string; last_read_at: string | null };
type UnreadMessageRow = { sender_id: string; created_at: string };
type MessageRow = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

function toChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

// Finds the existing 1:1 conversation between these two users, or creates one plus both
// participant rows. Chat is DM-only for now; `conversations.is_group` exists in the schema
// for a future group chat feature but nothing here creates one.
export async function getOrCreateDirectConversation(userId: string, friendId: string): Promise<string> {
  const { data: myConvos } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  const myConvoIds = ((myConvos ?? []) as ParticipantRow[]).map((r) => r.conversation_id);

  if (myConvoIds.length > 0) {
    const { data: shared } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', friendId)
      .in('conversation_id', myConvoIds)
      .limit(1);

    const existingId = ((shared ?? []) as ParticipantRow[])[0]?.conversation_id;
    if (existingId) return existingId;
  }

  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({ created_by: userId })
    .select('id')
    .single();
  if (error) throw error;

  const conversationId = (conversation as { id: string }).id;

  const { error: participantsError } = await supabase.from('conversation_participants').insert([
    { conversation_id: conversationId, user_id: userId },
    { conversation_id: conversationId, user_id: friendId },
  ]);
  if (participantsError) throw participantsError;

  return conversationId;
}

// A message counts as unread when someone else sent it after the last time this user
// opened the thread. `last_read_at` is null for a participant who has never opened it, in
// which case everything in the thread is unread.
function isUnreadFor(userId: string, message: UnreadMessageRow, lastReadAt: string | null): boolean {
  if (message.sender_id === userId) return false;
  if (!lastReadAt) return true;
  return new Date(message.created_at).getTime() > new Date(lastReadAt).getTime();
}

// Total unread messages across every conversation — what the Messages icon badges on each
// tab. The unread test is per-conversation (each thread has its own read cursor), which
// PostgREST can't express as a single filter, so the rows are compared here instead.
export async function countUnreadMessages(userId: string): Promise<number> {
  const { data: myConvos } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId);

  const cursors = (myConvos ?? []) as ReadCursorRow[];
  if (cursors.length === 0) return 0;

  const lastReadByConvo = new Map(cursors.map((c) => [c.conversation_id, c.last_read_at]));

  const { data: messages } = await supabase
    .from('messages')
    .select('conversation_id, sender_id, created_at')
    .in('conversation_id', [...lastReadByConvo.keys()])
    .neq('sender_id', userId);

  return ((messages ?? []) as (UnreadMessageRow & { conversation_id: string })[]).filter((m) =>
    isUnreadFor(userId, m, lastReadByConvo.get(m.conversation_id) ?? null),
  ).length;
}

// Moves this user's read cursor on one thread to now, clearing its unread count. Called
// when the thread is opened and again for anything that arrives while it's on screen.
export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function fetchConversations(userId: string): Promise<ConversationSummary[]> {
  const { data: myConvos } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId);

  const cursors = (myConvos ?? []) as ReadCursorRow[];
  const conversationIds = cursors.map((r) => r.conversation_id);
  if (conversationIds.length === 0) return [];

  const lastReadByConvo = new Map(cursors.map((c) => [c.conversation_id, c.last_read_at]));

  const { data: participants } = await supabase
    .from('conversation_participants')
    .select('conversation_id, user_id')
    .in('conversation_id', conversationIds)
    .neq('user_id', userId);

  const otherUserByConvo = new Map(
    ((participants ?? []) as ParticipantRow[]).map((p) => [p.conversation_id, p.user_id]),
  );

  const otherUserIds = [...new Set(otherUserByConvo.values())];
  const { data: profilesData } = otherUserIds.length
    ? await supabase.from('profiles').select('id, username, first_name, last_name').in('id', otherUserIds)
    : { data: [] as ProfileNameRow[] };
  const profileById = new Map(((profilesData ?? []) as ProfileNameRow[]).map((p) => [p.id, p]));

  const { data: messages } = await supabase
    .from('messages')
    .select('conversation_id, sender_id, body, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false });

  // One pass over the newest-first rows gives both the preview line and the unread count,
  // so the list doesn't need a second trip through countUnreadMessages.
  const lastMessageByConvo = new Map<string, { body: string; created_at: string }>();
  const unreadByConvo = new Map<string, number>();
  for (const m of (messages ?? []) as (UnreadMessageRow & { conversation_id: string; body: string })[]) {
    if (!lastMessageByConvo.has(m.conversation_id)) lastMessageByConvo.set(m.conversation_id, m);
    if (isUnreadFor(userId, m, lastReadByConvo.get(m.conversation_id) ?? null)) {
      unreadByConvo.set(m.conversation_id, (unreadByConvo.get(m.conversation_id) ?? 0) + 1);
    }
  }

  return conversationIds
    .map((id) => {
      const otherUserId = otherUserByConvo.get(id) ?? '';
      const last = lastMessageByConvo.get(id);
      return {
        id,
        otherUserId,
        otherUserName: displayName(profileById.get(otherUserId)),
        lastMessage: last?.body ?? null,
        lastMessageAt: last?.created_at ?? null,
        unreadCount: unreadByConvo.get(id) ?? 0,
      };
    })
    .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
}

// Looks up who the thread is with directly from the database, rather than trusting
// whatever navigation happened to pass in — so the header shows the right name
// regardless of how the screen was reached (list tap, deep link, notification, etc).
export async function fetchOtherParticipant(
  conversationId: string,
  userId: string,
): Promise<{ id: string; name: string } | null> {
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .neq('user_id', userId)
    .limit(1)
    .maybeSingle();

  const otherId = (participant as ParticipantRow | null)?.user_id;
  if (!otherId) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name')
    .eq('id', otherId)
    .maybeSingle();

  return { id: otherId, name: displayName(profile as ProfileNameRow | undefined) };
}

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return ((data ?? []) as MessageRow[]).map(toChatMessage);
}

export async function sendMessage(conversationId: string, senderId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;

  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body: trimmed });
  if (error) throw error;
}

// Pushes new messages to this conversation live via Supabase Realtime. Returns an
// unsubscribe function — callers must invoke it on unmount to avoid leaking the channel.
export function subscribeToMessages(conversationId: string, onInsert: (message: ChatMessage) => void): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(toChatMessage(payload.new as MessageRow)),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
