import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '@/store/userStore';
import { countIncomingRequests, fetchFriendsLeaderboard, type FriendLeaderboardEntry } from '@/lib/friends';
import { fetchFriendStreaks, type StreakEntry } from '@/lib/social';
import {
  fetchFriendPosts,
  fetchReactions,
  toggleReaction,
  timeAgo,
  ACTIVITY_TYPES,
  type FeedPost,
  type ReactionCounts,
  type ReactionKind,
} from '@/lib/posts';
import { fetchOpen1v1Challenges, inviteOpponent, type Open1v1Challenge } from '@/lib/challenges';
import { ChallengeFriendModal } from '@/components/ChallengeFriendModal';

const AVATAR_COLORS = ['#1E4D8C', '#4A5568', '#744210', '#065F46', '#5B21B6', '#831843', '#1E3A5F', '#3D2B1F'];
const EMPTY_REACTION: ReactionCounts = { fire: 0, like: 0, userFire: false, userLike: false };
type FilterType = 'All' | 'Feed' | 'Leaderboard' | 'Streaks';

function avatarColor(i: number): string {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

function formatPartnerDate(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

export default function SocialScreen() {
  const router = useRouter();
  const userId = useUserStore((state) => state.user?.id);
  const friendRequestCount = useUserStore((state) => state.friendRequestCount);
  const setFriendRequestCount = useUserStore((state) => state.setFriendRequestCount);

  const [filter, setFilter] = useState<FilterType>('All');
  const [loading, setLoading] = useState(true);
  const [streaks, setStreaks] = useState<StreakEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<FriendLeaderboardEntry[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [reactions, setReactions] = useState<Map<string, ReactionCounts>>(new Map());
  const [challengeTarget, setChallengeTarget] = useState<FeedPost | null>(null);
  const [open1v1, setOpen1v1] = useState<Open1v1Challenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [streaksData, leaderboardData, postsData] = await Promise.all([
      fetchFriendStreaks(userId),
      fetchFriendsLeaderboard(userId),
      fetchFriendPosts(userId),
    ]);
    setStreaks(streaksData);
    setLeaderboard(leaderboardData);
    setPosts(postsData);
    setLoading(false);

    fetchReactions(postsData.map((p) => p.id), userId).then(setReactions).catch(() => {});
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

  const showStreaks = filter === 'All' || filter === 'Streaks';
  const showLeaderboard = filter === 'All' || filter === 'Leaderboard';
  const showFeed = filter === 'All' || filter === 'Feed';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Social</Text>
        <View style={styles.headerIcons}>
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

      <View style={styles.filterRow}>
        {(['All', 'Feed', 'Leaderboard', 'Streaks'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>{f}</Text>
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

          {showLeaderboard && leaderboard.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Top Friends</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/rank?tab=Friends')}>
                  <Text style={styles.seeFullLink}>See full →</Text>
                </TouchableOpacity>
              </View>
              {leaderboard.slice(0, 5).map((entry, i) => {
                const isSelf = entry.userId === userId;
                return (
                  <View key={entry.userId} style={[styles.miniRow, isSelf && styles.miniRowSelf]}>
                    <Text style={styles.miniRank}>{entry.rank}</Text>
                    <View style={[styles.avatarSm, { backgroundColor: avatarColor(i) }]}>
                      <Text style={styles.avatarTextSm}>{entry.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.miniName} numberOfLines={1}>
                      {isSelf ? 'You' : entry.name}
                    </Text>
                    <View style={[styles.xpPill, isSelf && styles.xpPillSelf]}>
                      <Text style={[styles.xpPillText, isSelf && styles.xpPillTextSelf]}>{entry.xp} XP</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {showFeed && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ACTIVITY FEED</Text>
              {posts.length === 0 ? (
                <Text style={styles.emptyText}>No posts yet. Share an achievement or a thought to get started.</Text>
              ) : (
                posts.map((post, i) => {
                  const r = reactions.get(post.id) ?? EMPTY_REACTION;
                  const isSelf = post.userId === userId;
                  return (
                    <View key={post.id} style={styles.feedCard}>
                      <View style={styles.feedTopRow}>
                        <View style={[styles.avatar, { backgroundColor: avatarColor(i) }]}>
                          <Text style={styles.avatarText}>{post.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.feedName}>{isSelf ? 'You' : post.name}</Text>
                          <Text style={styles.feedTime}>{timeAgo(post.createdAt)}</Text>
                        </View>
                      </View>

                      {post.caption && <Text style={styles.feedCaption}>{post.caption}</Text>}

                      {post.achievementTitle && (
                        <View style={styles.achievementPill}>
                          <Text style={styles.achievementPillIcon}>{post.achievementIcon}</Text>
                          <Text style={styles.achievementPillText}>{post.achievementTitle}</Text>
                          {post.achievementXp != null && (
                            <Text style={styles.achievementPillXp}>+{post.achievementXp} XP</Text>
                          )}
                        </View>
                      )}

                      {post.type === 'partner' && (
                        <View style={styles.partnerCard}>
                          <View style={styles.partnerRow}>
                            <Text style={styles.partnerIcon}>
                              {ACTIVITY_TYPES.find((a) => a.value === post.activityType)?.icon ?? '⚡'}
                            </Text>
                            <Text style={styles.partnerText}>
                              {ACTIVITY_TYPES.find((a) => a.value === post.activityType)?.label ?? post.activityType}
                            </Text>
                          </View>
                          {post.activityAt && (
                            <View style={styles.partnerRow}>
                              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                              <Text style={styles.partnerText}>{formatPartnerDate(post.activityAt)}</Text>
                            </View>
                          )}
                          {post.location && (
                            <View style={styles.partnerRow}>
                              <Ionicons name="location-outline" size={14} color="#6B7280" />
                              <Text style={styles.partnerText}>{post.location}</Text>
                            </View>
                          )}
                          {post.peopleNeeded != null && (
                            <View style={styles.partnerRow}>
                              <Ionicons name="people-outline" size={14} color="#6B7280" />
                              <Text style={styles.partnerText}>{post.peopleNeeded} people needed</Text>
                            </View>
                          )}
                        </View>
                      )}

                      {post.linkedChallengeTitle && (
                        <TouchableOpacity
                          style={styles.linkedChallengePill}
                          onPress={() => router.push('/(tabs)/challenges')}
                        >
                          <Text style={styles.linkedChallengePillIcon}>{post.linkedChallengeIcon}</Text>
                          <Text style={styles.linkedChallengePillText}>Linked: {post.linkedChallengeTitle}</Text>
                          <Ionicons name="chevron-forward" size={14} color="#1B2B4B" />
                        </TouchableOpacity>
                      )}

                      <View style={styles.feedFooterRow}>
                        <TouchableOpacity
                          style={[styles.reactPill, r.userFire && styles.reactPillActive]}
                          onPress={() => handleReact(post.id, 'fire')}
                        >
                          <Text style={styles.reactEmoji}>🔥</Text>
                          <Text style={[styles.reactCount, r.userFire && styles.reactCountActive]}>{r.fire}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.reactPill, r.userLike && styles.reactPillActive]}
                          onPress={() => handleReact(post.id, 'like')}
                        >
                          <Ionicons name="thumbs-up" size={14} color={r.userLike ? '#1B2B4B' : '#8A9BB0'} />
                          <Text style={[styles.reactCount, r.userLike && styles.reactCountActive]}>{r.like}</Text>
                        </TouchableOpacity>
                        {!isSelf && (
                          <TouchableOpacity style={styles.challengeBtn} onPress={() => handleOpenChallenge(post)}>
                            <Ionicons name="flash" size={14} color="#F5B800" />
                            <Text style={styles.challengeBtnText}>Challenge</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {streaks.length === 0 && leaderboard.length <= 1 && posts.length === 0 && (
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

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: { backgroundColor: '#1B2B4B', borderColor: '#1B2B4B' },
  filterPillText: { fontSize: 13, fontWeight: '700', color: '#0D1829' },
  filterPillTextActive: { color: '#fff' },

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

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0D1829' },
  seeFullLink: { fontSize: 12, fontWeight: '700', color: '#1B2B4B' },

  miniRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  miniRowSelf: { backgroundColor: '#F0F4F8', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 10 },
  miniRank: { width: 18, fontSize: 13, fontWeight: '700', color: '#9CA3AF', textAlign: 'center' },

  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  avatarSm: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarTextSm: { color: '#fff', fontWeight: '800', fontSize: 12 },

  miniName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0D1829' },
  xpPill: { backgroundColor: '#F0F4F8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  xpPillSelf: { backgroundColor: '#1B2B4B' },
  xpPillText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  xpPillTextSelf: { color: '#fff' },

  feedCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  feedTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedName: { fontSize: 14, fontWeight: '800', color: '#0D1829' },
  feedTime: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  feedCaption: { fontSize: 14, color: '#374151', lineHeight: 19, marginTop: 10 },

  achievementPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDF3D6',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
  },
  achievementPillIcon: { fontSize: 14 },
  achievementPillText: { fontSize: 12, fontWeight: '700', color: '#8A6D00' },
  achievementPillXp: { fontSize: 11, fontWeight: '700', color: '#8A6D00', opacity: 0.8 },

  partnerCard: {
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    gap: 6,
  },
  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  partnerIcon: { fontSize: 14 },
  partnerText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  linkedChallengePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF2FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
  },
  linkedChallengePillIcon: { fontSize: 13 },
  linkedChallengePillText: { fontSize: 12, fontWeight: '700', color: '#1B2B4B' },

  feedFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  reactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reactPillActive: { backgroundColor: '#EBF2FF', borderColor: '#93B4E0' },
  reactEmoji: { fontSize: 13 },
  reactCount: { fontSize: 12, fontWeight: '700', color: '#8A9BB0' },
  reactCountActive: { color: '#1B2B4B' },
  challengeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginLeft: 'auto',
  },
  challengeBtnText: { fontSize: 12, fontWeight: '700', color: '#0D1829' },

  emptyText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
});
