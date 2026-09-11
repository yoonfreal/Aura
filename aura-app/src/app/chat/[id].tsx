import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CircleUserRound, Info, MessageCircle, Send } from 'lucide-react-native';

import { useUserStore } from '@/store/userStore';
import { fetchMessages, fetchOtherParticipant, sendMessage, subscribeToMessages, type ChatMessage } from '@/lib/chat';
import { splitProfileLink } from '@/lib/profileLink';

const BG = '#F0F4F8';
const CARD = '#FFFFFF';
const TEXT_DARK = '#1E2430';
const TEXT_MUTED = '#8A93A6';
const NAVY = '#1B2B4B';
const GOLD = '#F5B800';

// Same palette + hashing as the chat list, so a friend's avatar color is the same here as
// it is in Messages instead of always showing navy in the thread.
const AVATAR_COLORS = ['#1E4D8C', '#4A5568', '#744210', '#065F46', '#5B21B6', '#831843', '#1E3A5F', '#3D2B1F'];

function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatThreadScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const userId = useUserStore((state) => state.user?.id);

  // The nav param paints the header instantly (no flash of "Chat"); the DB lookup then
  // confirms/corrects it so the name is right even if the screen was reached another way.
  const [friendName, setFriendName] = useState(name || 'Chat');
  const [friendId, setFriendId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (!id || !userId) return;

    fetchOtherParticipant(id, userId)
      .then((other) => {
        if (!other) return;
        setFriendName(other.name);
        setFriendId(other.id);
      })
      .catch(() => {});

    setLoading(true);
    fetchMessages(id)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));

    const unsubscribe = subscribeToMessages(id, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    });

    return unsubscribe;
  }, [id, userId]);

  async function handleSend() {
    if (!id || !userId || !draft.trim() || sending) return;
    const body = draft.trim();
    setDraft('');
    setSending(true);
    try {
      await sendMessage(id, userId, body);
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          activeOpacity={friendId ? 0.7 : 1}
          disabled={!friendId}
          onPress={() => friendId && router.push(`/friend/${friendId}`)}
        >
          <View
            style={[
              styles.headerAvatar,
              friendId && { backgroundColor: avatarColorFor(friendId) },
            ]}
          >
            <Text style={styles.headerAvatarText}>{friendName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {friendName}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerBtn}
          activeOpacity={0.7}
          disabled={!friendId}
          onPress={() => friendId && router.push(`/friend/${friendId}`)}
        >
          <Info size={20} color={friendId ? TEXT_DARK : '#C7CFDC'} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={GOLD} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const mine = item.senderId === userId;
            const linkSplit = splitProfileLink(item.body);
            return (
              <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  {linkSplit ? (
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                      {linkSplit.before}
                      <Text
                        style={[styles.bubbleLink, mine && styles.bubbleLinkMine]}
                        onPress={() => router.push(`/friend/${linkSplit.userId}`)}
                      >
                        {linkSplit.link}
                      </Text>
                      {linkSplit.after}
                    </Text>
                  ) : (
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text>
                  )}
                  {linkSplit && (
                    <TouchableOpacity
                      style={[styles.profileChip, mine && styles.profileChipMine]}
                      activeOpacity={0.75}
                      onPress={() => router.push(`/friend/${linkSplit.userId}`)}
                    >
                      <CircleUserRound size={16} color={mine ? '#FFFFFF' : NAVY} />
                      <Text style={[styles.profileChipText, mine && styles.profileChipTextMine]}>View Profile</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.bubbleTime}>{formatTime(item.createdAt)}</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <MessageCircle size={26} color={NAVY} />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>Say hi to {friendName} 👋</Text>
            </View>
          }
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Message"
              placeholderTextColor="#A6ADBB"
              value={draft}
              onChangeText={setDraft}
              multiline
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!draft.trim() || sending}
            activeOpacity={0.8}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: BG,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK, maxWidth: 180 },

  list: { paddingHorizontal: 16, paddingVertical: 16, flexGrow: 1 },

  bubbleRow: { marginBottom: 12, alignItems: 'flex-start' },
  bubbleRowMine: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleTheirs: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: NAVY, borderBottomRightRadius: 4, shadowOpacity: 0 },
  bubbleText: { fontSize: 14, color: TEXT_DARK, lineHeight: 20 },
  bubbleTextMine: { color: '#FFFFFF' },
  bubbleLink: { color: '#3B6FD6', textDecorationLine: 'underline' },
  bubbleLinkMine: { color: '#CFE0FF' },
  bubbleTime: { fontSize: 10, color: TEXT_MUTED, marginTop: 4, marginHorizontal: 4 },

  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#EBF2FF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  profileChipMine: { backgroundColor: 'rgba(255,255,255,0.16)' },
  profileChipText: { fontSize: 12, fontWeight: '700', color: NAVY },
  profileChipTextMine: { color: '#FFFFFF' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E4E9F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  emptyText: { fontSize: 13, color: TEXT_MUTED, marginTop: 4 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: BG,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 22,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 14,
    color: TEXT_DARK,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 2,
  },
  sendBtnDisabled: { opacity: 0.35, shadowOpacity: 0 },
});
