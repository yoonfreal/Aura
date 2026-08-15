import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '@/store/userStore';
import {
  fetchPostById,
  fetchReactions,
  toggleReaction,
  fetchJoins,
  joinPost,
  leavePost,
  deletePost,
  fetchComments,
  addComment,
  deleteComment,
  type FeedPost,
  type ReactionCounts,
  type JoinState,
  type ReactionKind,
  type Comment,
} from '@/lib/posts';
import { fetchOpen1v1Challenges, inviteOpponent, type Open1v1Challenge } from '@/lib/challenges';
import { ChallengeFriendModal } from '@/components/ChallengeFriendModal';
import { PostCard } from '@/components/PostCard';

const EMPTY_REACTION: ReactionCounts = { fire: 0, like: 0, userFire: false, userLike: false };
const EMPTY_JOIN: JoinState = { count: 0, joined: false };
const AVATAR_COLORS = ['#1E4D8C', '#4A5568', '#744210', '#065F46', '#5B21B6', '#831843', '#1E3A5F', '#3D2B1F'];

export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserStore((state) => state.user?.id);

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<FeedPost | null>(null);
  const [reaction, setReaction] = useState<ReactionCounts>(EMPTY_REACTION);
  const [join, setJoin] = useState<JoinState>(EMPTY_JOIN);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [open1v1, setOpen1v1] = useState<Open1v1Challenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);

  const load = useCallback(async () => {
    if (!userId || !id) return;
    setLoading(true);
    setLoadingComments(true);
    const found = await fetchPostById(id);
    setPost(found);
    setLoading(false);

    if (!found) {
      setLoadingComments(false);
      return;
    }

    fetchReactions([found.id], userId)
      .then((map) => setReaction(map.get(found.id) ?? EMPTY_REACTION))
      .catch(() => {});
    fetchJoins([found.id], userId)
      .then((map) => setJoin(map.get(found.id) ?? EMPTY_JOIN))
      .catch(() => {});
    fetchComments(found.id)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [userId, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleReact(kind: ReactionKind) {
    if (!userId || !post) return;
    const isOn = kind === 'fire' ? reaction.userFire : reaction.userLike;
    const previous = reaction;
    setReaction({
      ...reaction,
      fire: kind === 'fire' ? reaction.fire + (isOn ? -1 : 1) : reaction.fire,
      like: kind === 'like' ? reaction.like + (isOn ? -1 : 1) : reaction.like,
      userFire: kind === 'fire' ? !isOn : reaction.userFire,
      userLike: kind === 'like' ? !isOn : reaction.userLike,
    });
    try {
      await toggleReaction(userId, post.id, kind, isOn);
    } catch {
      setReaction(previous);
    }
  }

  async function handleToggleJoin() {
    if (!userId || !post) return;
    const previous = join;
    if (join.joined) {
      setJoin({ count: Math.max(0, join.count - 1), joined: false });
      try {
        await leavePost(userId, post.id);
      } catch {
        setJoin(previous);
      }
      return;
    }
    if (post.peopleNeeded != null && join.count >= post.peopleNeeded) return;
    setJoin({ count: join.count + 1, joined: true });
    try {
      await joinPost(userId, post.id, post.peopleNeeded);
    } catch (err) {
      setJoin(previous);
      Alert.alert('Could not join', (err as { message?: string })?.message ?? 'Please try again.');
    }
  }

  function handleOpenChallenge() {
    setChallengeOpen(true);
    setLoadingChallenges(true);
    fetchOpen1v1Challenges()
      .then(setOpen1v1)
      .catch(() => setOpen1v1([]))
      .finally(() => setLoadingChallenges(false));
  }

  async function handleConfirmChallenge(challengeId: string) {
    if (!userId || !post) return;
    try {
      await inviteOpponent(userId, challengeId, post.userId);
      setChallengeOpen(false);
      Alert.alert('Challenge sent!', `${post.name} has been invited to race. Check the Challenges tab.`);
    } catch (err) {
      Alert.alert('Could not send challenge', (err as { message?: string })?.message ?? 'Please try again.');
    }
  }

  function handleDeletePost() {
    if (!userId || !post) return;
    Alert.alert('Delete post?', 'This removes it for everyone who could see it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(userId, post.id);
            router.back();
          } catch (err) {
            Alert.alert('Could not delete', (err as { message?: string })?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  }

  async function handleAddComment() {
    if (!userId || !post || !commentDraft.trim() || postingComment) return;
    setPostingComment(true);
    try {
      await addComment(userId, post.id, post.userId, commentDraft);
      setCommentDraft('');
      setComments(await fetchComments(post.id));
    } catch (err) {
      Alert.alert('Could not comment', (err as { message?: string })?.message ?? 'Please try again.');
    } finally {
      setPostingComment(false);
    }
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
          setComments(comments.filter((c) => c.id !== comment.id));
          try {
            await deleteComment(userId, comment.id);
          } catch (err) {
            setComments(previous);
            Alert.alert('Could not delete', (err as { message?: string })?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#0D1829" />
        </TouchableOpacity>
        <Text style={styles.title}>Post</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1B2B4B" />
      ) : !post ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={40} color="#C0C8D4" />
          <Text style={styles.emptyText}>This post isn't available anymore.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PostCard
            post={post}
            avatarColor={AVATAR_COLORS[0]}
            currentUserId={userId}
            onDelete={handleDeletePost}
            onOpenLinkedChallenge={() => router.push('/(tabs)/challenges')}
            reaction={reaction}
            onReact={handleReact}
            join={join}
            onToggleJoin={handleToggleJoin}
            onOpenChallenge={handleOpenChallenge}
            commentCount={comments.length}
            commentsExpanded
            onToggleComments={() => {}}
            comments={comments}
            loadingComments={loadingComments}
            commentDraft={commentDraft}
            onChangeCommentDraft={setCommentDraft}
            onSubmitComment={handleAddComment}
            postingComment={postingComment}
            onDeleteComment={handleDeleteComment}
          />
        </ScrollView>
      )}

      <ChallengeFriendModal
        visible={challengeOpen}
        friendName={post?.name ?? ''}
        challenges={open1v1}
        loading={loadingChallenges}
        onClose={() => setChallengeOpen(false)}
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
    paddingBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0D1829' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center' },
});
