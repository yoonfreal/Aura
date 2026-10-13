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


export async function getOrCreateDirectConversation(userId: string, friendId: string): Promise<string> {
  const { data: myConvos } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  //Get the IDs of every chat I am part of.
  const myConvoIds = ((myConvos ?? []) as ParticipantRow[]).map((r) => r.conversation_id);

  //look for a participant row where the person is my friend and the chat is one of mine. That's a chat we share.
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

  //if none found, create new chat
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({ created_by: userId })
    .select('id')
    .single(); //give back the new row's ID
  if (error) throw error;

  const conversationId = (conversation as { id: string }).id;

  //add two participants
  const { error: participantsError } = await supabase.from('conversation_participants').insert([
    { conversation_id: conversationId, user_id: userId },
    { conversation_id: conversationId, user_id: friendId },
  ]);
  if (participantsError) throw participantsError;

  return conversationId;
}

function isUnreadFor(userId: string, message: UnreadMessageRow, lastReadAt: string | null): boolean {
  if (message.sender_id === userId) return false;
  if (!lastReadAt) return true; //unread

  //was the message sent after I last read? --> unread
  return new Date(message.created_at).getTime() > new Date(lastReadAt).getTime();
}

export async function countUnreadMessages(userId: string): Promise<number> {
  const { data: myConvos } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', userId);

  const cursors = (myConvos ?? []) as ReadCursorRow[];
  if (cursors.length === 0) return 0;

  const lastReadByConvo = new Map(cursors.map((c) => [c.conversation_id, c.last_read_at]));

  //all messages in my chats that were not sent by me
  const { data: messages } = await supabase
    .from('messages')
    .select('conversation_id, sender_id, created_at')
    .in('conversation_id', [...lastReadByConvo.keys()]) //take nonly the chat IDs and filter the messages: "Only messages whose chat is one of these."
    .neq('sender_id', userId); //neq = not equal, only messages where the sender is not me.

  return ((messages ?? []) as (UnreadMessageRow & { conversation_id: string })[]).filter((m) =>
    isUnreadFor(userId, m, lastReadByConvo.get(m.conversation_id) ?? null),
  ).length;
}

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

  //who am I talking to
  const otherUserByConvo = new Map(
    ((participants ?? []) as ParticipantRow[]).map((p) => [p.conversation_id, p.user_id]),
  );

  const otherUserIds = [...new Set(otherUserByConvo.values())];
  const { data: profilesData } = otherUserIds.length
    ? await supabase.from('profiles').select('id, username, first_name, last_name').in('id', otherUserIds)
    : { data: [] as ProfileNameRow[] }; //return empty if no result
  const profileById = new Map(((profilesData ?? []) as ProfileNameRow[]).map((p) => [p.id, p]));

  const { data: messages } = await supabase
    .from('messages')
    .select('conversation_id, sender_id, body, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false });

  
  //the latest message in each chat, shown as the grey preview text.
  const lastMessageByConvo = new Map<string, { body: string; created_at: string }>();

  //how many unread messages each chat has, shown as the small number badge.
  const unreadByConvo = new Map<string, number>();
  for (const m of (messages ?? []) as (UnreadMessageRow & { conversation_id: string; body: string })[]) {
    //if this chat doesn't have a message saved yet, save this one.
    if (!lastMessageByConvo.has(m.conversation_id)) lastMessageByConvo.set(m.conversation_id, m);

    //If this message is unread, add 1 to that chat's count.
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

//In this chat, who am I talking to?
export async function fetchOtherParticipant(
  conversationId: string,
  userId: string,
): Promise<{ id: string; name: string } | null> {
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)// in the current chat
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

  //{ id: Mya's ID, name: "Mya" }
  return { id: otherId, name: displayName(profile as ProfileNameRow | undefined) };
}

//loads all the messages in one chat so they can be shown on the chat screen.
export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true }); //oldest first
  if (error) throw error;

  return ((data ?? []) as MessageRow[]).map(toChatMessage);//messages or an empty list if there are none.
}

//sends a chat message by saving it to the database.
export async function sendMessage(conversationId: string, senderId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;

  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body: trimmed });
  if (error) throw error;
}

//makes new messages appear instantly while a chat is open, without refreshing
export function subscribeToMessages(conversationId: string, onInsert: (message: ChatMessage) => void): () => void {

  //Creates a live connection for this chat
  const channel = supabase
    .channel(`messages:${conversationId}`)

    //Say what to listen for
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(toChatMessage(payload.new as MessageRow)), //What to do when one arrives
      //when a message comes, display


    )
    .subscribe();//starts listening

  //for leaving the chat
  return () => {
    supabase.removeChannel(channel);
  };
}
