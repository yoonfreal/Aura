import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, MessageCirclePlus, Search } from 'lucide-react-native';

import { useUserStore } from '@/store/userStore';
import { fetchAcceptedFriends } from '@/lib/friends';
import { fetchConversations, getOrCreateDirectConversation } from '@/lib/chat';

const BG = '#F0F4F8';
const CARD = '#FFFFFF';
const DIVIDER = '#EEF1F6';
const TEXT_DARK = '#1E2430';
const TEXT_MUTED = '#8A93A6';
const NAVY = '#1B2B4B';
const GOLD = '#F5B800';

// Same palette Social already uses for friend avatars — keeps a person's color consistent
// with how they look everywhere else in the app, not just this screen.
const AVATAR_COLORS = ['#1E4D8C', '#4A5568', '#744210', '#065F46', '#5B21B6', '#831843', '#1E3A5F', '#3D2B1F'];

// Keyed by friend id (not list position) so a person's color stays fixed even as the list
// reorders itself around new messages.
function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

type ChatListRow = {
  friendId: string;
  friendName: string;
  conversationId: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export default function ChatListScreen() {
  const router = useRouter();
  const userId = useUserStore((state) => state.user?.id);
  const setUnreadMessageCount = useUserStore((state) => state.setUnreadMessageCount);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ChatListRow[]>([]);
  const [query, setQuery] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([fetchAcceptedFriends(userId), fetchConversations(userId)])
      .then(([friends, conversations]) => {
        const conversationByFriendId = new Map(conversations.map((c) => [c.otherUserId, c]));

        const merged: ChatListRow[] = friends.map((friend) => {
          const conversation = conversationByFriendId.get(friend.id);
          return {
            friendId: friend.id,
            friendName: friend.name,
            conversationId: conversation?.id ?? null,
            lastMessage: conversation?.lastMessage ?? null,
            lastMessageAt: conversation?.lastMessageAt ?? null,
            unreadCount: conversation?.unreadCount ?? 0,
          };
        });

        // The conversations query already counted every unread message, so reuse that
        // total for the tab headers' badge instead of asking the server again.
        setUnreadMessageCount(conversations.reduce((total, c) => total + c.unreadCount, 0));

        merged.sort((a, b) => {
          if (a.lastMessageAt && b.lastMessageAt) return b.lastMessageAt.localeCompare(a.lastMessageAt);
          if (a.lastMessageAt) return -1;
          if (b.lastMessageAt) return 1;
          return a.friendName.localeCompare(b.friendName);
        });

        setRows(merged);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [userId, setUnreadMessageCount]);

  useFocusEffect(load);

  const { activeRows, contactRows } = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const filtered = trimmed ? rows.filter((r) => r.friendName.toLowerCase().includes(trimmed)) : rows;
    return {
      activeRows: filtered.filter((r) => r.lastMessageAt),
      contactRows: filtered.filter((r) => !r.lastMessageAt),
    };
  }, [rows, query]);

  async function handlePressRow(row: ChatListRow) {
    if (!userId || openingId) return;

    if (row.conversationId) {
      router.push({ pathname: '/chat/[id]', params: { id: row.conversationId, name: row.friendName } });
      return;
    }

    setOpeningId(row.friendId);
    try {
      const conversationId = await getOrCreateDirectConversation(userId, row.friendId);
      router.push({ pathname: '/chat/[id]', params: { id: conversationId, name: row.friendName } });
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Messages</Text>
          {rows.length > 0 && (
            <Text style={styles.headerSubtitle}>
              {activeRows.length > 0 ? `${activeRows.length} active · ${rows.length} friends` : `${rows.length} friends`}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {!loading && rows.length > 0 && (
        <View style={styles.searchBar}>
          <Search size={17} color={TEXT_MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#A6ADBB"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={GOLD} />
      ) : rows.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <MessageCirclePlus size={30} color={NAVY} />
          </View>
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptyText}>Add friends to start chatting with them here.</Text>
        </View>
      ) : activeRows.length === 0 && contactRows.length === 0 ? (
        <Text style={styles.noResultsText}>No friends match "{query}"</Text>
      ) : (
        <FlatList
          data={[{ key: 'content' }]}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          renderItem={() => (
            <>
              {activeRows.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>CHATS</Text>
                  {activeRows.map((item) => (
                    <TouchableOpacity
                      key={item.friendId}
                      style={styles.chatCard}
                      activeOpacity={0.6}
                      onPress={() => handlePressRow(item)}
                    >
                      <View style={[styles.avatar, { backgroundColor: avatarColorFor(item.friendId) }]}>
                        <Text style={styles.avatarText}>{item.friendName.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {item.friendName}
                        </Text>
                        <Text
                          style={[styles.rowPreview, item.unreadCount > 0 && styles.rowPreviewUnread]}
                          numberOfLines={1}
                        >
                          {item.lastMessage}
                        </Text>
                      </View>
                      <View style={styles.rowTrailing}>
                        <Text style={styles.rowTime}>{timeAgo(item.lastMessageAt)}</Text>
                        {item.unreadCount > 0 ? (
                          <View style={styles.unreadPill}>
                            <Text style={styles.unreadPillText}>
                              {item.unreadCount > 9 ? '9+' : item.unreadCount}
                            </Text>
                          </View>
                        ) : (
                          <ChevronRight size={16} color="#C7CFDC" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {contactRows.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>{activeRows.length > 0 ? 'START A CHAT' : 'FRIENDS'}</Text>
                  <View style={styles.contactGroup}>
                    {contactRows.map((item, i) => (
                      <TouchableOpacity
                        key={item.friendId}
                        style={[styles.contactRow, i > 0 && styles.contactRowDivider]}
                        activeOpacity={0.6}
                        disabled={openingId === item.friendId}
                        onPress={() => handlePressRow(item)}
                      >
                        <View
                          style={[
                            styles.avatarSmall,
                            { backgroundColor: avatarColorFor(item.friendId) },
                          ]}
                        >
                          <Text style={styles.avatarTextSmall}>{item.friendName.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.contactName} numberOfLines={1}>
                          {item.friendName}
                        </Text>
                        {openingId === item.friendId ? (
                          <ActivityIndicator size="small" color={GOLD} />
                        ) : (
                          <MessageCirclePlus size={18} color="#9AA6BC" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        />
      )}
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
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 19, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.2 },
  headerSubtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 1, fontWeight: '600' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CARD,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 42,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_DARK, height: 42 },

  list: { paddingHorizontal: 16, paddingBottom: 24 },

  section: { marginTop: 18 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },

  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  rowPreview: { fontSize: 13, color: TEXT_MUTED },
  rowPreviewUnread: { color: TEXT_DARK, fontWeight: '700' },
  rowTrailing: { alignItems: 'flex-end', gap: 6 },
  rowTime: { fontSize: 11, color: TEXT_MUTED, fontWeight: '600' },
  unreadPill: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadPillText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  contactGroup: {
    backgroundColor: CARD,
    borderRadius: 18,
    paddingHorizontal: 14,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  contactRowDivider: { borderTopWidth: 1, borderTopColor: DIVIDER },
  avatarSmall: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarTextSmall: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  contactName: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT_DARK },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E4E9F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT_DARK },
  emptyText: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', marginTop: 6, lineHeight: 19 },

  noResultsText: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', marginTop: 40 },
});
