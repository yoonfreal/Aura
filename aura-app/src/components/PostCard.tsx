import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  timeAgo,
  ACTIVITY_TYPES,
  type FeedPost,
  type ReactionCounts,
  type ReactionKind,
  type JoinState,
  type Comment,
} from '@/lib/posts';
import { ActivityTypeIcon } from '@/components/ActivityTypeIcon';

function formatPartnerDate(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

type PostCardProps = {
  post: FeedPost;
  avatarColor: string;
  currentUserId: string | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onOpenLinkedChallenge: () => void;

  reaction: ReactionCounts;
  onReact: (kind: ReactionKind) => void;

  join: JoinState;
  onToggleJoin: () => void;
  onOpenChallenge: () => void;

  commentCount: number;
  commentsExpanded: boolean;
  onToggleComments: () => void;
  comments: Comment[];
  loadingComments: boolean;
  commentDraft: string;
  onChangeCommentDraft: (text: string) => void;
  onSubmitComment: () => void;
  postingComment: boolean;
  onDeleteComment: (comment: Comment) => void;
};

// Shared by the Social feed and the single-post detail screen (opened from a notification) —
// both need identical rendering and interaction, so this stays the one place that changes.
export function PostCard({
  post,
  avatarColor,
  currentUserId,
  onEdit,
  onDelete,
  onOpenLinkedChallenge,
  reaction,
  onReact,
  join,
  onToggleJoin,
  onOpenChallenge,
  commentCount,
  commentsExpanded,
  onToggleComments,
  comments,
  loadingComments,
  commentDraft,
  onChangeCommentDraft,
  onSubmitComment,
  postingComment,
  onDeleteComment,
}: PostCardProps) {
  const isSelf = post.userId === currentUserId;
  const isFull = post.peopleNeeded != null && join.count >= post.peopleNeeded;

  return (
    <View style={styles.feedCard}>
      <View style={styles.feedTopRow}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{post.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedName}>{isSelf ? 'You' : post.name}</Text>
          <Text style={styles.feedTime}>{timeAgo(post.createdAt)}</Text>
        </View>
        {isSelf && (
          <View style={styles.ownPostActions}>
            <TouchableOpacity onPress={onEdit} hitSlop={8}>
              <Ionicons name="create-outline" size={18} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {post.caption && <Text style={styles.feedCaption}>{post.caption}</Text>}

      {post.achievementTitle && (
        <View style={styles.achievementPill}>
          <Text style={styles.achievementPillIcon}>{post.achievementIcon}</Text>
          <Text style={styles.achievementPillText}>{post.achievementTitle}</Text>
          {post.achievementXp != null && <Text style={styles.achievementPillXp}>+{post.achievementXp} XP</Text>}
        </View>
      )}

      {post.type === 'partner' && (
        <View style={styles.partnerCard}>
          <View style={styles.partnerRow}>
            <ActivityTypeIcon
              activityType={
                ACTIVITY_TYPES.find((a) => a.value === post.activityType) ?? {
                  value: post.activityType ?? 'other',
                  label: post.activityType ?? 'Other',
                  icon: 'ellipsis-horizontal-outline',
                }
              }
              size={14}
              color="#374151"
            />
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
          <View style={styles.partnerRow}>
            <Ionicons name="people-outline" size={14} color="#6B7280" />
            <Text style={styles.partnerText}>
              {post.peopleNeeded != null
                ? `${join.count}/${post.peopleNeeded} joined${isFull ? ' · Full' : ''}`
                : `${join.count} joined · Open to anyone`}
            </Text>
          </View>
        </View>
      )}

      {post.linkedChallengeTitle && (
        <TouchableOpacity style={styles.linkedChallengePill} onPress={onOpenLinkedChallenge}>
          <Text style={styles.linkedChallengePillIcon}>{post.linkedChallengeIcon}</Text>
          <Text style={styles.linkedChallengePillText}>Linked: {post.linkedChallengeTitle}</Text>
          <Ionicons name="chevron-forward" size={14} color="#1B2B4B" />
        </TouchableOpacity>
      )}

      <View style={styles.feedFooterRow}>
        <TouchableOpacity style={[styles.reactPill, reaction.userFire && styles.reactPillActive]} onPress={() => onReact('fire')}>
          <Text style={styles.reactEmoji}>🔥</Text>
          <Text style={[styles.reactCount, reaction.userFire && styles.reactCountActive]}>{reaction.fire}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.reactPill, reaction.userLike && styles.reactPillActive]} onPress={() => onReact('like')}>
          <Ionicons name="thumbs-up" size={14} color={reaction.userLike ? '#1B2B4B' : '#8A9BB0'} />
          <Text style={[styles.reactCount, reaction.userLike && styles.reactCountActive]}>{reaction.like}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.reactPill, commentsExpanded && styles.reactPillActive]} onPress={onToggleComments}>
          <Ionicons name="chatbubble-outline" size={14} color={commentsExpanded ? '#1B2B4B' : '#8A9BB0'} />
          <Text style={[styles.reactCount, commentsExpanded && styles.reactCountActive]}>{commentCount}</Text>
        </TouchableOpacity>
        {!isSelf && post.type === 'partner' && (
          <TouchableOpacity
            style={[styles.joinBtn, join.joined && styles.joinBtnJoined, isFull && !join.joined && styles.joinBtnDisabled]}
            disabled={isFull && !join.joined}
            onPress={onToggleJoin}
          >
            <Ionicons
              name={join.joined ? 'checkmark-circle' : 'add-circle-outline'}
              size={14}
              color={join.joined ? '#fff' : isFull ? '#9CA3AF' : '#1B2B4B'}
            />
            <Text
              style={[
                styles.joinBtnText,
                join.joined && styles.joinBtnTextJoined,
                isFull && !join.joined && styles.joinBtnTextDisabled,
              ]}
            >
              {join.joined ? 'Joined' : isFull ? 'Full' : 'Join'}
            </Text>
          </TouchableOpacity>
        )}
        {!isSelf && post.type !== 'partner' && (
          <TouchableOpacity style={styles.challengeBtn} onPress={onOpenChallenge}>
            <Ionicons name="flash" size={14} color="#F5B800" />
            <Text style={styles.challengeBtnText}>Challenge</Text>
          </TouchableOpacity>
        )}
      </View>

      {commentsExpanded && (
        <View style={styles.commentsSection}>
          {loadingComments ? (
            <ActivityIndicator color="#1B2B4B" style={{ marginVertical: 10 }} />
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.commentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentName}>
                    {c.userId === currentUserId ? 'You' : c.name} <Text style={styles.commentTime}>· {timeAgo(c.createdAt)}</Text>
                  </Text>
                  <Text style={styles.commentBody}>{c.body}</Text>
                </View>
                {c.userId === currentUserId && (
                  <TouchableOpacity onPress={() => onDeleteComment(c)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={15} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
          {!loadingComments && comments.length === 0 && <Text style={styles.emptyText}>No comments yet.</Text>}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor="#9CA3AF"
              value={commentDraft}
              onChangeText={onChangeCommentDraft}
            />
            <TouchableOpacity
              style={[styles.commentSendBtn, !commentDraft.trim() && styles.commentSendBtnDisabled]}
              disabled={!commentDraft.trim() || postingComment}
              onPress={onSubmitComment}
            >
              {postingComment ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={14} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  ownPostActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
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
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#93B4E0',
    backgroundColor: '#EBF2FF',
    marginLeft: 'auto',
  },
  joinBtnText: { fontSize: 12, fontWeight: '700', color: '#1B2B4B' },
  joinBtnJoined: { backgroundColor: '#1B2B4B', borderColor: '#1B2B4B' },
  joinBtnTextJoined: { color: '#fff' },
  joinBtnDisabled: { backgroundColor: '#F0F4F8', borderColor: '#E2E8F0' },
  joinBtnTextDisabled: { color: '#9CA3AF' },

  commentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  commentName: { fontSize: 12, fontWeight: '700', color: '#0D1829' },
  commentTime: { fontSize: 11, fontWeight: '400', color: '#9CA3AF' },
  commentBody: { fontSize: 13, color: '#374151', marginTop: 2, lineHeight: 18 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  commentInput: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0D1829',
  },
  commentSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1B2B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendBtnDisabled: { backgroundColor: '#C0C8D4' },

  emptyText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
});
