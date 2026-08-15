import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useUserStore } from '@/store/userStore';
import {
  fetchIncomingRequests,
  fetchSentRequests,
  fetchSuggestedFriends,
  searchUsersToAdd,
  sendFriendRequest,
  acceptFriendRequest,
  cancelFriendRequest,
  markIncomingRequestsSeen,
  type FriendRequestEntry,
  type FriendSearchResult,
  type FriendSuggestion,
} from '@/lib/friends';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CARD_COLORS = ['#1E4D8C', '#744210', '#065F46', '#5B21B6', '#831843', '#3D2B1F'];
const INCOMING_COLLAPSED_COUNT = 3;

export default function FriendsScreen() {
  const router = useRouter();
  const userId = useUserStore((state) => state.user?.id);
  const setFriendRequestCount = useUserStore((state) => state.setFriendRequestCount);

  const [incoming, setIncoming] = useState<FriendRequestEntry[]>([]);
  const [sent, setSent] = useState<FriendRequestEntry[]>([]);
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [incomingExpanded, setIncomingExpanded] = useState(false);
  const [suppressIncomingAnim, setSuppressIncomingAnim] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [incomingData, sentData, suggestionsData] = await Promise.all([
      fetchIncomingRequests(userId),
      fetchSentRequests(userId),
      fetchSuggestedFriends(userId),
    ]);
    setIncoming(incomingData);
    setSent(sentData);
    setSuggestions(suggestionsData);
    setLoading(false);

    // Viewing this screen clears the notification badge — it only comes back (from 1) for
    // requests that arrive after this point, not the ones already shown here.
    if (incomingData.length > 0) {
      markIncomingRequestsSeen(userId).catch(() => {});
    }
    setFriendRequestCount(0);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests]),
  );

  async function handleSearch(text: string) {
    setQuery(text);
    if (!userId || !text.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const found = await searchUsersToAdd(text, userId);
    setResults(found);
    setSearching(false);
  }

  async function handleAdd(targetId: string) {
    if (!userId) return;
    setPendingIds((prev) => new Set(prev).add(targetId));
    await sendFriendRequest(userId, targetId);
    setResults((prev) => prev.map((r) => (r.id === targetId ? { ...r, relation: 'sent' } : r)));
    loadRequests();
  }

  async function handleAccept(requestId: string) {
    setSuppressIncomingAnim(true);
    await acceptFriendRequest(requestId);
    await loadRequests();
    requestAnimationFrame(() => setSuppressIncomingAnim(false));
  }

  async function handleAcceptFromSearch(item: FriendSearchResult) {
    if (!item.requestId) return;
    await acceptFriendRequest(item.requestId);
    setResults((prev) => prev.map((r) => (r.id === item.id ? { ...r, relation: 'friends' } : r)));
    loadRequests();
  }

  async function handleCancel(requestId: string) {
    await cancelFriendRequest(requestId);
    loadRequests();
  }

  async function handleAddSuggestion(targetId: string) {
    if (!userId || pendingIds.has(targetId)) return;
    setPendingIds((prev) => new Set(prev).add(targetId));
    await sendFriendRequest(userId, targetId);
    loadRequests();
    // Hold the checkmark on screen for a beat — like Snapchat's Quick Add — before the
    // card snaps out of the grid, so the tap reads as confirmed rather than just vanishing.
    setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSuggestions((prev) => prev.filter((s) => s.id !== targetId));
    }, 500);
  }

  const showingSearch = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#0D1829" />
        </TouchableOpacity>
        <Text style={styles.title}>Friends</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          value={query}
          onChangeText={handleSearch}
        />
      </View>

      {showingSearch ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{searching ? 'Searching…' : 'No users found'}</Text>
          }
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: CARD_COLORS[index % CARD_COLORS.length] }]}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.level}>Level {item.level}</Text>
              </View>
              {item.relation === 'none' && (
                <TouchableOpacity
                  style={[styles.quickAddPill, pendingIds.has(item.id) && styles.quickAddPillDone]}
                  disabled={pendingIds.has(item.id)}
                  onPress={() => handleAdd(item.id)}
                >
                  <Ionicons name={pendingIds.has(item.id) ? 'checkmark' : 'person-add'} size={14} color="#1B2B4B" />
                  <Text style={styles.quickAddPillText}>{pendingIds.has(item.id) ? 'Added' : 'Add'}</Text>
                </TouchableOpacity>
              )}
              {item.relation === 'sent' && <Text style={styles.statusText}>Pending</Text>}
              {item.relation === 'incoming' && (
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptFromSearch(item)}>
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
              )}
              {item.relation === 'friends' && <Text style={styles.statusText}>Friends</Text>}
            </View>
          )}
        />
      ) : loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1B2B4B" />
      ) : ( 
        <ScrollView contentContainerStyle={styles.list}>
          {incoming.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Added me</Text>
                {incoming.length > INCOMING_COLLAPSED_COUNT && (
                  <TouchableOpacity
                    style={styles.viewMoreBtn}
                    onPress={() => setIncomingExpanded((prev) => !prev)}
                  >
                    <Text style={styles.viewMoreInline}>
                      {incomingExpanded ? 'View less' : `View more (${incoming.length - INCOMING_COLLAPSED_COUNT})`}
                    </Text>
                    <Ionicons name={incomingExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#1B2B4B" />
                  </TouchableOpacity>
                )}
              </View>
              {(incomingExpanded ? incoming : incoming.slice(0, INCOMING_COLLAPSED_COUNT)).map((req, i) => {
                const extraIndex = i - INCOMING_COLLAPSED_COUNT;
                return (
                  <Animated.View
                    key={req.id}
                    layout={suppressIncomingAnim ? undefined : LinearTransition.duration(220)}
                    entering={
                      !suppressIncomingAnim && extraIndex >= 0
                        ? FadeInUp.duration(220).delay(extraIndex * 40)
                        : undefined
                    }
                    exiting={suppressIncomingAnim ? undefined : FadeOutUp.duration(180)}
                    style={styles.row}
                  >
                    <View style={[styles.avatar, { backgroundColor: CARD_COLORS[i % CARD_COLORS.length] }]}>
                      <Text style={styles.avatarText}>{req.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.name}>{req.name}</Text>
                      <Text style={styles.level}>Level {req.level}</Text>
                    </View>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(req.id)}>
                      <Text style={styles.acceptBtnText}>Accept</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </>
          )}

          {sent.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>SENT · PENDING</Text>
              {sent.map((req) => (
                <View key={req.id} style={styles.row}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{req.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.name}>{req.name}</Text>
                    <Text style={styles.level}>Level {req.level}</Text>
                  </View>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleCancel(req.id)}>
                    <Text style={styles.rejectBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {suggestions.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>People you may know</Text>
              {suggestions.map((sug, i) => {
                const added = pendingIds.has(sug.id);
                return (
                  <View key={sug.id} style={styles.row}>
                    <View style={[styles.avatar, { backgroundColor: CARD_COLORS[i % CARD_COLORS.length] }]}>
                      <Text style={styles.avatarText}>{sug.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.name}>{sug.name}</Text>
                      <Text style={styles.level}>
                        {sug.mutualCount > 0
                          ? `${sug.mutualCount} mutual friend${sug.mutualCount > 1 ? 's' : ''}`
                          : `Level ${sug.level}`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.quickAddPill, added && styles.quickAddPillDone]}
                      disabled={added}
                      onPress={() => handleAddSuggestion(sug.id)}
                    >
                      <Ionicons name={added ? 'checkmark' : 'person-add'} size={14} color="#1B2B4B" />
                      <Text style={styles.quickAddPillText}>{added ? 'Added' : 'Add'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )}

          {incoming.length === 0 && sent.length === 0 && suggestions.length === 0 && (
            <Text style={styles.emptyText}>No pending requests. Search above to add a friend.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F6F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#0D1829' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0D1829' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewMoreInline: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E4D8C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  rowInfo: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: '#0D1829' },
  level: { fontSize: 12, color: '#8A9BB0', marginTop: 2 },
  acceptBtn: { backgroundColor: '#1B2B4B', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 15 },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  rejectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rejectBtnText: { color: '#0D1829', fontWeight: '700', fontSize: 12 },
  statusText: { fontSize: 12, color: '#8A9BB0', fontWeight: '600' },
  emptyText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  quickAddPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5B800',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 15,
  },
  quickAddPillDone: { backgroundColor: '#EDE7D9' },
  quickAddPillText: { color: '#1B2B4B', fontWeight: '400', fontSize: 13 },
});
