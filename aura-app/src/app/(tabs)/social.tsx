import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '@/store/userStore';
import { countIncomingRequests } from '@/lib/friends';
import { fetchFriendStreaks, type StreakEntry } from '@/lib/social';
import {
  fetchFriendPosts,
  fetchReactions,
  toggleReaction,
  fetchJoins,
  joinPost,
  leavePost,
  deletePost,
  fetchCommentCounts,
  fetchComments,
  addComment,
  deleteComment,
  type FeedPost,
  type ReactionCounts,
  type ReactionKind,
  type JoinState,
  type Comment,
} from '@/lib/posts';
import { fetchOpen1v1Challenges, inviteOpponent, type Open1v1Challenge } from '@/lib/challenges';
import {
  countUnreadNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from '@/lib/notifications';
import { ChallengeFriendModal } from '@/components/ChallengeFriendModal';
import { NotificationsModal } from '@/components/NotificationsModal';
import { PostCard } from '@/components/PostCard';

const AVATAR_COLORS = ['#1E4D8C', '#4A5568', '#744210', '#065F46', '#5B21B6', '#831843', '#1E3A5F', '#3D2B1F'];
const EMPTY_REACTION: ReactionCounts = { fire: 0, like: 0, userFire: false, userLike: false };
const EMPTY_JOIN: JoinState = { count: 0, joined: false };
type FilterType = 'All' | 'Feed' | 'Streaks';
const FILTER_TYPES: FilterType[] = ['All', 'Feed', 'Streaks'];
type PostFilter = 'All' | 'Mine' | 'Partner' | 'Achievement' | 'General';
const POST_FILTERS: PostFilter[] = ['All', 'Mine', 'Partner', 'Achievement', 'General'];

function avatarColor(i: number): string {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

export default function SocialScreen() {
  const router = useRouter();
  const userId = useUserStore((state) => state.user?.id);
  const friendRequestCount = useUserStore((state) => state.friendRequestCount);
  const setFriendRequestCount = useUserStore((state) => state.setFriendRequestCount);
  const unreadNotifications = useUserStore((state) => state.notificationCount);
  const setUnreadNotifications = useUserStore((state) => state.setNotificationCount);

  const [filter, setFilter] = useState<FilterType>('All');
  const [filterTrackWidth, setFilterTrackWidth] = useState(0);
  const filterPillAnim = useRef(new Animated.Value(0)).current;
  const [postFilter, setPostFilter] = useState<PostFilter>('All');
  const [loading, setLoading] = useState(true);
  const [streaks, setStreaks] = useState<StreakEntry[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [reactions, setReactions] = useState<Map<string, ReactionCounts>>(new Map());
  const [joins, setJoins] = useState<Map<string, JoinState>>(new Map());
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map());
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState<FeedPost | null>(null);
  const [open1v1, setOpen1v1] = useState<Open1v1Challenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    Animated.timing(filterPillAnim, {
      toValue: FILTER_TYPES.indexOf(filter),
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [filter]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [streaksData, postsData] = await Promise.all([
      fetchFriendStreaks(userId),
      fetchFriendPosts(userId),
    ]);
    setStreaks(streaksData);
    setPosts(postsData);
    setLoading(false);

    countUnreadNotifications(userId).then(setUnreadNotifications).catch(() => {});
    fetchReactions(postsData.map((p) => p.id), userId).then(setReactions).catch(() => {});
    fetchJoins(postsData.map((p) => p.id), userId).then(setJoins).catch(() => {});
    fetchCommentCounts(postsData.map((p) => p.id)).then(setCommentCounts).catch(() => {});
    countIncomingRequests(userId).then(setFriendRequestCount).catch(() => {});
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleReact(postId: string, kind: ReactionKind) {
    if (!userId) return;
    const current = reactions.get(postId) ?? EMPTY_REACTION;
    const isOn = kind === 'fire' ? current.userFire : current.userLike;
    const optimistic = new Map(reactions);
    optimistic.set(postId, {
      ...current,
      fire: kind === 'fire' ? current.fire + (isOn ? -1 : 1) : current.fire,
      like: kind === 'like' ? current.like + (isOn ? -1 : 1) : current.like,
      userFire: kind === 'fire' ? !isOn : current.userFire,
      userLike: kind === 'like' ? !isOn : current.userLike,
    });
    setReactions(optimistic);
    try {
      await toggleReaction(userId, postId, kind, isOn);
    } catch {
      setReactions(reactions);
    }
  }

  async function handleJoinToggle(post: FeedPost) {
    if (!userId) return;
    const current = joins.get(post.id) ?? EMPTY_JOIN;
    const optimistic = new Map(joins);

    if (current.joined) {
      optimistic.set(post.id, { count: Math.max(0, current.count - 1), joined: false });
      setJoins(optimistic);
      try {
        await leavePost(userId, post.id);
      } catch {
        setJoins(joins);
      }
      return;
    }

    if (post.peopleNeeded != null && current.count >= post.peopleNeeded) return;
    optimistic.set(post.id, { count: current.count + 1, joined: true });
    setJoins(optimistic);
    try {
      await joinPost(userId, post.id, post.peopleNeeded);
    } catch (err) {
      setJoins(joins);
      Alert.alert('Could not join', (err as { message?: string })?.message ?? 'Please try again.');
    }
  }

  function handleOpenChallenge(post: FeedPost) {
    setChallengeTarget(post);
    setLoadingChallenges(true);
    fetchOpen1v1Challenges()
      .then(setOpen1v1)
      .catch(() => setOpen1v1([]))
      .finally(() => setLoadingChallenges(false));
  }

  async function handleConfirmChallenge(challengeId: string) {
    if (!userId || !challengeTarget) return;
    try {
      await inviteOpponent(userId, challengeId, challengeTarget.userId);
      const friendName = challengeTarget.name;
      setChallengeTarget(null);
      Alert.alert('Challenge sent!', `${friendName} has been invited to race. Check the Challenges tab.`);
    } catch (err) {
      Alert.alert('Could not send challenge', (err as { message?: string })?.message ?? 'Please try again.');
    }
  }

  function handleEditPost(post: FeedPost) {
    router.push({ pathname: '/create-post', params: { editPostId: post.id } });
  }

  function handleDeletePost(post: FeedPost) {
    if (!userId) return;
    Alert.alert('Delete post?', 'This removes it for everyone who could see it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const previous = posts;
          setPosts((prev) => prev.filter((p) => p.id !== post.id));
          try {
            await deletePost(userId, post.id);
          } catch (err) {
            setPosts(previous);
            Alert.alert('Could not delete', (err as { message?: string })?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  }

  function handleToggleComments(postId: string) {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);
    setCommentDraft('');
    setLoadingComments(true);
    fetchComments(postId)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }

  async function handleAddComment(post: FeedPost) {
    if (!userId || !commentDraft.trim() || postingComment) return;
    setPostingComment(true);
    try {
      await addComment(userId, post.id, post.userId, commentDraft);
      setCommentDraft('');
      const updated = await fetchComments(post.id);
      setComments(updated);
      setCommentCounts((prev) => new Map(prev).set(post.id, updated.length));
    } catch (err) {
      Alert.alert('Could not comment', (err as { message?: string })?.message ?? 'Please try again.');
    } finally {
      setPostingComment(false);
    }
  }

  function handleOpenNotifications() {
    if (!userId) return;
    setShowNotifications(true);
    setLoadingNotifications(true);
    fetchNotifications(userId)
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoadingNotifications(false));
    markAllNotificationsRead(userId)
      .then(() => setUnreadNotifications(0))
      .catch(() => {});
  }

  function handleNotificationPress(notification: AppNotification) {
    setShowNotifications(false);

    if (notification.type === 'challenge_complete' && notification.challengeId) {
      router.push({
        pathname: '/(tabs)/challenges',
        params: { openChallengeId: notification.challengeId },
      });
      return;
    }

    if (!notification.postId) return;
    router.push(`/post/${notification.postId}`);
  }

  function handleDeleteComment(comment: Comment) {
    if (!userId) return;
    Alert.alert('Delete comment?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const previous = comments;
          const next = comments.filter((c) => c.id !== comment.id);
          setComments(next);
          setCommentCounts((prev) => new Map(prev).set(comment.postId, next.length));
          try {
            await deleteComment(userId, comment.id);
          } catch (err) {
            setComments(previous);
            setCommentCounts((prev) => new Map(prev).set(comment.postId, previous.length));
            Alert.alert('Could not delete', (err as { message?: string })?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  }

  const filteredPosts = posts.filter((post) => {
    switch (postFilter) {
      case 'Mine':
        return post.userId === userId;
      case 'Partner':
        return post.type === 'partner';
      case 'Achievement':
        return post.type === 'achievement';
      case 'General':
        return post.type === 'thoughts';
      default:
        return true;
    }
  });

  const showStreaks = filter === 'All' || filter === 'Streaks';
  const showFeed = filter === 'All' || filter === 'Feed';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Social</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleOpenNotifications}>
            <Ionicons name="notifications-outline" size={20} color="#1B2B4B" />
            {unreadNotifications > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/create-post')}>
            <Ionicons name="add-circle-outline" size={22} color="#1B2B4B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/friends')}>
            <Ionicons name="person-add-outline" size={20} color="#1B2B4B" />
            {friendRequestCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{friendRequestCount > 9 ? '9+' : friendRequestCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="chatbubble-outline" size={20} color="#1B2B4B" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterTrack} onLayout={(e) => setFilterTrackWidth(e.nativeEvent.layout.width)}>
        {filterTrackWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.filterPill,
              {
                width: `${100 / FILTER_TYPES.length}%`,
                transform: [
                  {
                    translateX: filterPillAnim.interpolate({
                      inputRange: [0, FILTER_TYPES.length - 1],
                      outputRange: [0, (filterTrackWidth / FILTER_TYPES.length) * (FILTER_TYPES.length - 1)],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
        {FILTER_TYPES.map((f) => (
          <TouchableOpacity key={f} style={styles.filterBtn} onPress={() => setFilter(f)} activeOpacity={0.8}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1B2B4B" />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {showStreaks && streaks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>🔥 STREAK SPOTLIGHT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.streakRow}>
                {streaks.map((s, i) => (
                  <View key={s.userId} style={styles.streakCard}>
                    <View style={[styles.avatar, { backgroundColor: avatarColor(i) }]}>
                      <Text style={styles.avatarText}>{s.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.streakName} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text style={styles.streakDays}>🔥 {s.streakDays} days</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {showFeed && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ACTIVITY FEED</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.postFilterRow}>
                {POST_FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.postFilterPill, postFilter === f && styles.postFilterPillActive]}
                    onPress={() => setPostFilter(f)}
                  >
                    <Text style={[styles.postFilterPillText, postFilter === f && styles.postFilterPillTextActive]}>
                      {f === 'General' ? 'General' : f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {filteredPosts.length === 0 ? (
                <Text style={styles.emptyText}>
                  {postFilter === 'Mine'
                    ? "You haven't posted anything yet."
                    : 'No posts yet. Share an achievement or a thought to get started.'}
                </Text>
              ) : (
                filteredPosts.map((post, i) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    avatarColor={avatarColor(i)}
                    currentUserId={userId}
                    onEdit={() => handleEditPost(post)}
                    onDelete={() => handleDeletePost(post)}
                    onOpenLinkedChallenge={() => router.push('/(tabs)/challenges')}
                    reaction={reactions.get(post.id) ?? EMPTY_REACTION}
                    onReact={(kind) => handleReact(post.id, kind)}
                    join={joins.get(post.id) ?? EMPTY_JOIN}
                    onToggleJoin={() => handleJoinToggle(post)}
                    onOpenChallenge={() => handleOpenChallenge(post)}
                    commentCount={commentCounts.get(post.id) ?? 0}
                    commentsExpanded={expandedPostId === post.id}
                    onToggleComments={() => handleToggleComments(post.id)}
                    comments={expandedPostId === post.id ? comments : []}
                    loadingComments={loadingComments}
                    commentDraft={commentDraft}
                    onChangeCommentDraft={setCommentDraft}
                    onSubmitComment={() => handleAddComment(post)}
                    postingComment={postingComment}
                    onDeleteComment={handleDeleteComment}
                  />
                ))
              )}
            </View>
          )}

          {streaks.length === 0 && posts.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color="#C0C8D4" />
              <Text style={[styles.emptyText, { marginTop: 12 }]}>
                Add friends to see their streaks, posts, and rank here
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <ChallengeFriendModal
        visible={!!challengeTarget}
        friendName={challengeTarget?.name ?? ''}
        challenges={open1v1}
        loading={loadingChallenges}
        onClose={() => setChallengeTarget(null)}
        onConfirm={handleConfirmChallenge}
      />

      <NotificationsModal
        visible={showNotifications}
        notifications={notifications}
        loading={loadingNotifications}
        onClose={() => setShowNotifications(false)}
        onPressNotification={handleNotificationPress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F4F8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#0D1829', letterSpacing: -0.3 },
  headerIcons: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  filterTrack: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#E8EDF2',
    borderRadius: 12,
    padding: 3,
    position: 'relative',
  },
  filterPill: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', zIndex: 1 },
  filterText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  filterTextActive: { color: '#1B2B4B', fontWeight: '700' },

  content: { paddingHorizontal: 20, paddingBottom: 40 },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  postFilterRow: { gap: 8, paddingRight: 8, marginBottom: 14 },
  postFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  postFilterPillActive: { backgroundColor: '#1B2B4B', borderColor: '#1B2B4B' },
  postFilterPillText: { fontSize: 12, fontWeight: '700', color: '#0D1829' },
  postFilterPillTextActive: { color: '#fff' },

  streakRow: { gap: 12, paddingRight: 8 },
  streakCard: {
    width: 92,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  streakName: { fontSize: 13, fontWeight: '700', color: '#0D1829', marginTop: 8, maxWidth: 80 },
  streakDays: { fontSize: 11, color: '#F5B800', fontWeight: '700', marginTop: 2 },

  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  emptyText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
});
