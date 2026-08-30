import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { ArrowLeft } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';

import { useUserStore } from '@/store/userStore';

import {
  fetchBadges,
  fetchOpen1v1Challenges,
  inviteOpponent,
  type EarnedBadge,
  type Open1v1Challenge,
} from '@/lib/challenges';

import { getLevelTitle, xpAtLevelStart, xpForLevel } from '@/lib/level';

import {
  fetchFriendPosts,
  fetchReactions,
  toggleReaction,
  fetchJoins,
  joinPost,
  leavePost,
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

import { PostCard } from '@/components/PostCard';

import { ChallengeFriendModal } from '@/components/ChallengeFriendModal';
import { FriendListModal } from '@/components/FriendListModal';

const BG = '#F0F4F8';
const CARD = '#FFFFFF';
const BORDER = '#E3E7F0';
const TEXT_DARK = '#1E2430';
const TEXT_MUTED = '#8A93A6';

const AVATAR_GREEN = '#2F5D4E';

const GOLD = '#F5B800';
const GOLD_PILL = '#FEF3C7';
const GOLD_PILL_TEXT = '#D97706';

const MEDAL_RED = '#E0552B';
const ICON_BG_PEACH = '#FBDCC8';

const FRIEND_AVATAR_COLORS = [
  '#1E4D8C',
  '#4A5568',
  '#744210',
  '#065F46',
  '#5B21B6',
];

const EMPTY_REACTION: ReactionCounts = {
  fire: 0,
  like: 0,
  userFire: false,
  userLike: false,
};

const EMPTY_JOIN: JoinState = {
  count: 0,
  joined: false,
};

type FriendProfile = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  level: number | null;
  xp: number | null;
  streak_days: number | null;
};

type Friend = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  level: number | null;
};

type FriendshipRow = {
  requester_id: string;
  addressee_id: string;
};

function XpRing({
  pct,
  size = 96,
  stroke = 6,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <Svg
      width={size}
      height={size}
      style={{
        position: 'absolute',
        transform: [{ rotate: '-90deg' }],
      }}
    >
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#D6E8F5"
        strokeWidth={stroke}
        fill="none"
      />

      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#4A90D9"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
      />
    </Svg>
  );
}

function StatPill({
  icon,
  iconColor,
  iconBg,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statPill}>
      <View
        style={[
          styles.statIconWrap,
          { backgroundColor: iconBg },
        ]}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>

      <Text style={styles.statValue}>{value}</Text>

      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function FriendProfileScreen() {
  const router = useRouter();

  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const userId = useUserStore(
    (state) => state.user?.id
  );

  // =========================================================
  // PROFILE
  // =========================================================

  const [profile, setProfile] =
    useState<FriendProfile | null>(null);

  const [badges, setBadges] =
    useState<EarnedBadge[]>([]);

  const [friends, setFriends] =
    useState<Friend[]>([]);

  const [friendCount, setFriendCount] =
    useState(0);

  const [friendListVisible, setFriendListVisible] =
    useState(false);

  // =========================================================
  // POSTS
  // =========================================================

  const [posts, setPosts] =
    useState<FeedPost[]>([]);

  const [reactions, setReactions] =
    useState<
      Map<string, ReactionCounts>
    >(new Map());

  const [joins, setJoins] =
    useState<
      Map<string, JoinState>
    >(new Map());

  const [commentCounts, setCommentCounts] =
    useState<
      Map<string, number>
    >(new Map());

  const [expandedPostId, setExpandedPostId] =
    useState<string | null>(null);

  const [comments, setComments] =
    useState<Comment[]>([]);

  const [loadingComments, setLoadingComments] =
    useState(false);

  const [commentDraft, setCommentDraft] =
    useState('');

  const [postingComment, setPostingComment] =
    useState(false);

  // =========================================================
  // CHALLENGE
  // =========================================================

  const [challengeTarget, setChallengeTarget] =
    useState<FeedPost | null>(null);

  const [open1v1, setOpen1v1] =
    useState<Open1v1Challenge[]>([]);

  const [loadingChallenges, setLoadingChallenges] =
    useState(false);

  // =========================================================
  // LOADING
  // =========================================================

  const [loading, setLoading] =
    useState(true);

  const [loadingFriends, setLoadingFriends] =
    useState(true);

  const [loadingPosts, setLoadingPosts] =
    useState(true);

  // =========================================================
  // LOAD EVERYTHING
  // =========================================================

  useEffect(() => {
    if (!id) return;

    loadFriendProfile();
    loadFriendBadges();
    loadFriendFriends();
    loadFriendPosts();
  }, [id, userId]);

  // =========================================================
  // LOAD PROFILE
  // =========================================================

  const loadFriendProfile = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          first_name,
          last_name,
          level,
          xp,
          streak_days
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error(
          'Error loading friend profile:',
          error
        );

        return;
      }

      setProfile(data);
    } catch (error) {
      console.error(
        'Unexpected profile error:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD BADGES
  // =========================================================

  const loadFriendBadges = async () => {
    if (!id) return;

    try {
      const [data, { data: profileData }] =
        await Promise.all([
          fetchBadges(id),
          supabase
            .from('profiles')
            .select('hidden_badges')
            .eq('id', id)
            .single(),
        ]);

      const hidden =
        profileData?.hidden_badges ?? [];

      setBadges(
        data.filter(
          (badge) => !hidden.includes(badge.label)
        )
      );
    } catch (error) {
      console.error(
        'Error loading friend badges:',
        error
      );

      setBadges([]);
    }
  };

  // =========================================================
  // LOAD FRIENDS
  // =========================================================

  const loadFriendFriends = async () => {
    if (!id) return;

    try {
      setLoadingFriends(true);

      const {
        data: friendshipRows,
        error: friendshipError,
      } = await supabase
        .from('friendships')
        .select(
          'requester_id, addressee_id'
        )
        .eq('status', 'accepted')
        .or(
          `requester_id.eq.${id},addressee_id.eq.${id}`
        );

      if (friendshipError) {
        console.error(
          'Error loading friend friendships:',
          friendshipError
        );

        setFriends([]);
        setFriendCount(0);

        return;
      }

      const rows =
        (friendshipRows ??
          []) as FriendshipRow[];

      const friendIds =
        rows
          .map((friendship) => {
            if (
              friendship.requester_id ===
              id
            ) {
              return friendship.addressee_id;
            }

            return friendship.requester_id;
          })
          .filter(
            (friendId, index, array) =>
              friendId &&
              array.indexOf(friendId) ===
                index
          );

      setFriendCount(
        friendIds.length
      );

      if (
        friendIds.length === 0
      ) {
        setFriends([]);
        return;
      }

      const {
        data: profileRows,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          first_name,
          last_name,
          level
        `)
        .in('id', friendIds);

      if (profileError) {
        console.error(
          'Error loading friend profiles:',
          profileError
        );

        setFriends([]);

        return;
      }

      const profileMap =
        new Map(
          (profileRows ?? []).map(
            (friend) => [
              friend.id,
              friend,
            ]
          )
        );

      const orderedFriends =
        friendIds
          .map((friendId) =>
            profileMap.get(friendId)
          )
          .filter(Boolean) as Friend[];

      setFriends(
        orderedFriends
      );
    } catch (error) {
      console.error(
        'Unexpected friends error:',
        error
      );

      setFriends([]);
      setFriendCount(0);
    } finally {
      setLoadingFriends(false);
    }
  };

  // =========================================================
  // LOAD FRIEND POSTS
  // =========================================================

  const loadFriendPosts = async () => {
    if (!id) return;

    try {
      setLoadingPosts(true);

      /*
       * IMPORTANT:
       *
       * Use the same fetchFriendPosts()
       * used by Social.
       *
       * This gives us the proper FeedPost
       * including the real user's name.
       */
      const data =
  await fetchFriendPosts(id);

// Friend profile should ONLY show
// posts created by this friend.
const friendPosts = data.filter(
  (post) => post.userId === id
);

setPosts(friendPosts);

      /*
       * Load reactions.
       */
      if (
        userId &&
        data.length > 0
      ) {
        fetchReactions(
          data.map(
            (post) => post.id
          ),
          userId
        )
          .then(setReactions)
          .catch((error) =>
            console.error(
              'Error loading reactions:',
              error
            )
          );

        /*
         * Load Join information.
         */
        fetchJoins(
          data.map(
            (post) => post.id
          ),
          userId
        )
          .then(setJoins)
          .catch((error) =>
            console.error(
              'Error loading joins:',
              error
            )
          );
      }

      /*
       * Load comment counts.
       */
      if (data.length > 0) {
        fetchCommentCounts(
          data.map(
            (post) => post.id
          )
        )
          .then(setCommentCounts)
          .catch((error) =>
            console.error(
              'Error loading comment counts:',
              error
            )
          );
      }
    } catch (error) {
      console.error(
        'Error loading friend posts:',
        error
      );

      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  // =========================================================
  // REACTION
  // =========================================================

  async function handleReact(
    postId: string,
    kind: ReactionKind
  ) {
    if (!userId) return;

    const current =
      reactions.get(postId) ??
      EMPTY_REACTION;

    const isOn =
      kind === 'fire'
        ? current.userFire
        : current.userLike;

    const optimistic =
      new Map(reactions);

    optimistic.set(
      postId,
      {
        ...current,

        fire:
          kind === 'fire'
            ? current.fire +
              (isOn ? -1 : 1)
            : current.fire,

        like:
          kind === 'like'
            ? current.like +
              (isOn ? -1 : 1)
            : current.like,

        userFire:
          kind === 'fire'
            ? !isOn
            : current.userFire,

        userLike:
          kind === 'like'
            ? !isOn
            : current.userLike,
      }
    );

    setReactions(
      optimistic
    );

    try {
      await toggleReaction(
        userId,
        postId,
        kind,
        isOn
      );
    } catch (error) {
      console.error(
        'Error reacting:',
        error
      );

      setReactions(
        reactions
      );
    }
  }

  // =========================================================
  // JOIN / LEAVE
  // =========================================================

  async function handleJoinToggle(
    post: FeedPost
  ) {
    if (!userId) return;

    const current =
      joins.get(post.id) ??
      EMPTY_JOIN;

    const optimistic =
      new Map(joins);

    /*
     * Leave if already joined.
     */
    if (current.joined) {
      optimistic.set(
        post.id,
        {
          count: Math.max(
            0,
            current.count - 1
          ),
          joined: false,
        }
      );

      setJoins(
        optimistic
      );

      try {
        await leavePost(
          userId,
          post.id
        );
      } catch (error) {
        console.error(
          'Error leaving post:',
          error
        );

        setJoins(
          joins
        );
      }

      return;
    }

    /*
     * Don't allow joining if
     * the post is already full.
     */
    if (
      post.peopleNeeded != null &&
      current.count >=
        post.peopleNeeded
    ) {
      return;
    }

    optimistic.set(
      post.id,
      {
        count:
          current.count + 1,
        joined: true,
      }
    );

    setJoins(
      optimistic
    );

    try {
      await joinPost(
        userId,
        post.id,
        post.peopleNeeded
      );
    } catch (error) {
      console.error(
        'Error joining post:',
        error
      );

      setJoins(
        joins
      );

      Alert.alert(
        'Could not join',
        (
          error as {
            message?: string;
          }
        )?.message ??
          'Please try again.'
      );
    }
  }

  // =========================================================
  // CHALLENGE
  // =========================================================

  function handleOpenChallenge(
    post: FeedPost
  ) {
    setChallengeTarget(
      post
    );

    setLoadingChallenges(
      true
    );

    fetchOpen1v1Challenges()
      .then(setOpen1v1)
      .catch(() =>
        setOpen1v1([])
      )
      .finally(() =>
        setLoadingChallenges(
          false
        )
      );
  }

  async function handleConfirmChallenge(
    challengeId: string
  ) {
    if (
      !userId ||
      !challengeTarget
    ) {
      return;
    }

    try {
      await inviteOpponent(
        userId,
        challengeId,
        challengeTarget.userId
      );

      const friendName =
        challengeTarget.name;

      setChallengeTarget(
        null
      );

      Alert.alert(
        'Challenge sent!',
        `${friendName} has been invited to race. Check the Challenges tab.`
      );
    } catch (error) {
      Alert.alert(
        'Could not send challenge',
        (
          error as {
            message?: string;
          }
        )?.message ??
          'Please try again.'
      );
    }
  }

  // =========================================================
  // COMMENTS
  // =========================================================

  function handleToggleComments(
    postId: string
  ) {
    if (
      expandedPostId ===
      postId
    ) {
      setExpandedPostId(
        null
      );

      return;
    }

    setExpandedPostId(
      postId
    );

    setCommentDraft('');

    setLoadingComments(
      true
    );

    fetchComments(postId)
      .then(setComments)
      .catch(() =>
        setComments([])
      )
      .finally(() =>
        setLoadingComments(
          false
        )
      );
  }

  async function handleAddComment(
    post: FeedPost
  ) {
    if (
      !userId ||
      !commentDraft.trim() ||
      postingComment
    ) {
      return;
    }

    setPostingComment(
      true
    );

    try {
      await addComment(
        userId,
        post.id,
        post.userId,
        commentDraft
      );

      setCommentDraft('');

      const updated =
        await fetchComments(
          post.id
        );

      setComments(
        updated
      );

      setCommentCounts(
        (previous) =>
          new Map(
            previous
          ).set(
            post.id,
            updated.length
          )
      );
    } catch (error) {
      Alert.alert(
        'Could not comment',
        (
          error as {
            message?: string;
          }
        )?.message ??
          'Please try again.'
      );
    } finally {
      setPostingComment(
        false
      );
    }
  }

  // =========================================================
  // DELETE COMMENT
  // =========================================================

  function handleDeleteComment(
    comment: Comment
  ) {
    if (!userId) return;

    Alert.alert(
      'Delete comment?',
      undefined,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            const previous =
              comments;

            const next =
              comments.filter(
                (item) =>
                  item.id !==
                  comment.id
              );

            setComments(
              next
            );

            setCommentCounts(
              (previousCounts) =>
                new Map(
                  previousCounts
                ).set(
                  comment.postId,
                  next.length
                )
            );

            try {
              await deleteComment(
                userId,
                comment.id
              );
            } catch (error) {
              setComments(
                previous
              );

              setCommentCounts(
                (previousCounts) =>
                  new Map(
                    previousCounts
                  ).set(
                    comment.postId,
                    previous.length
                  )
              );

              Alert.alert(
                'Could not delete',
                (
                  error as {
                    message?: string;
                  }
                )?.message ??
                  'Please try again.'
              );
            }
          },
        },
      ]
    );
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color={GOLD}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView
        style={styles.safe}
      >
        <View
          style={
            styles.loadingContainer
          }
        >
          <Text
            style={styles.errorText}
          >
            Profile not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================
  // DISPLAY DATA
  // =========================================================

  const displayName =
    profile.username ||
    `${profile.first_name ?? ''} ${
      profile.last_name ?? ''
    }`.trim() ||
    'Friend';

  const level =
    profile.level ?? 1;

  const xp =
    profile.xp ?? 0;

  const streak =
    profile.streak_days ?? 0;

  const earnedBadges =
    badges.filter(
      (badge) =>
        badge.earned
    );

  const earnedCount =
    earnedBadges.length;

  const levelStartXp =
    xpAtLevelStart(level);

  const xpForNextLevel =
    xpForLevel(level + 1);

  const xpPercent =
    Math.min(
      100,
      Math.round(
        ((xp - levelStartXp) /
          (xpForNextLevel -
            levelStartXp)) *
          100
      )
    );

  const displayedFriends =
    friends.slice(0, 5);

  return (
    <SafeAreaView
      style={styles.safe}
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* =================================================
            HEADER
            ================================================= */}

        <View
          style={styles.header}
        >
          <TouchableOpacity
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
            activeOpacity={0.7}
          >
            <ArrowLeft
              size={22}
              color={TEXT_DARK}
            />
          </TouchableOpacity>

          <Text
            style={
              styles.headerTitle
            }
          >
            Profile
          </Text>

          <View
            style={{
              width: 40,
            }}
          />
        </View>

        {/* =================================================
            PROFILE + STATS
            ================================================= */}

        <View style={styles.profileCard}>
          <View
            style={
              styles.profileSection
            }
          >
            <View style={styles.avatarWrap}>
              <XpRing pct={xpPercent} />

              <View
                style={styles.avatarCircle}
              >
                <Text
                  style={
                    styles.avatarText
                  }
                >
                  {displayName
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>
            </View>

            <Text
              style={styles.name}
            >
              {displayName}
            </Text>

            <Text
              style={
                styles.levelText
              }
            >
              Level {level} -{' '}
              {getLevelTitle(level)}
            </Text>

            <View
              style={
                styles.xpBarRow
              }
            >
              <View
                style={
                  styles.xpTrack
                }
              >
                <View
                  style={[
                    styles.xpFill,
                    {
                      width: `${xpPercent}%`,
                    },
                  ]}
                />
              </View>

              <Text
                style={
                  styles.xpLabel
                }
              >
                {xp - levelStartXp}/
                {xpForNextLevel -
                  levelStartXp}{' '}
                XP
              </Text>
            </View>
          </View>

          <View
            style={styles.statsRow}
          >
            <StatPill
              icon="trophy"
              iconColor="#D97706"
              iconBg="#FEF3C7"
              value={String(xp)}
              label="XP"
            />

            <StatPill
              icon="flame"
              iconColor="#DC2626"
              iconBg="#FEE2E2"
              value={String(streak)}
              label="Streak"
            />

            <StatPill
              icon="medal"
              iconColor={MEDAL_RED}
              iconBg={ICON_BG_PEACH}
              value={String(earnedCount)}
              label="Badges"
            />
          </View>
        </View>

        {/* =================================================
            FRIENDS
            ================================================= */}

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.75}
          onPress={() =>
            setFriendListVisible(true)
          }
        >
          <View
            style={
              styles.cardHeaderRow
            }
          >
            <Text
              style={
                styles.cardTitle
              }
            >
              Friends
            </Text>

            <Text
              style={
                styles.cardMeta
              }
            >
              {friendCount}{' '}
              friends
            </Text>
          </View>

          {loadingFriends ? (
            <ActivityIndicator
              size="small"
              color={GOLD}
            />
          ) : displayedFriends.length >
            0 ? (
              <View
                style={
                  styles.friendsRow
                }
              >
                {displayedFriends.map(
                  (
                    friend,
                    index
                  ) => {
                    const name =
                      friend.username ||
                      friend.first_name ||
                      'Friend';

                    return (
                      <TouchableOpacity
                        key={
                          friend.id
                        }
                        activeOpacity={
                          0.7
                        }
                        onPress={() =>
                          router.push(
                            `/friend/${friend.id}`
                          )
                        }
                        style={[
                          styles.friendAvatar,
                          {
                            backgroundColor:
                              FRIEND_AVATAR_COLORS[
                                index %
                                  FRIEND_AVATAR_COLORS.length
                              ],
                          },
                        ]}
                      >
                        <Text
                          style={
                            styles.friendAvatarText
                          }
                        >
                          {name
                            .charAt(
                              0
                            )
                            .toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
          ) : (
            <Text
              style={
                styles.noFriendsText
              }
            >
              No friends yet
            </Text>
          )}
        </TouchableOpacity>

        {/* =================================================
            BADGES
            ================================================= */}

        <View
          style={styles.card}
        >
          <View
            style={
              styles.cardHeaderRow
            }
          >
            <Text
              style={
                styles.cardTitle
              }
            >
              BADGE COLLECTION
            </Text>
          </View>

          {earnedBadges.length > 0 ? (
            <View
              style={
                styles.badgeWrap
              }
            >
              {earnedBadges.map(
                (badge) => (
                  <View
                    key={badge.label}
                    style={[
                      styles.badgePill,
                      { backgroundColor: GOLD_PILL },
                    ]}
                  >
                    <Text
                      style={
                        styles.badgeEmoji
                      }
                    >
                      {badge.icon}
                    </Text>

                    <Text
                      style={[
                        styles.badgeLabel,
                        { color: GOLD_PILL_TEXT },
                      ]}
                    >
                      {badge.label}
                    </Text>
                  </View>
                )
              )}
            </View>
          ) : (
            <Text
              style={
                styles.placeholder
              }
            >
              No badges earned yet
            </Text>
          )}
        </View>

        {/* =================================================
            POSTS
            ================================================= */}

        <Text
          style={
            styles.postsTitle
          }
        >
          POSTS
        </Text>

        {loadingPosts ? (
          <View
            style={
              styles.postsLoading
            }
          >
            <ActivityIndicator
              size="small"
              color={GOLD}
            />
          </View>
        ) : posts.length > 0 ? (
          <View style={styles.postsListWrap}>
          {posts.map(
            (post, index) => (
              <PostCard
                key={post.id}

                post={post}

                avatarColor={
                  FRIEND_AVATAR_COLORS[
                    index %
                      FRIEND_AVATAR_COLORS.length
                  ]
                }

                /*
                 * Current logged-in user.
                 * This is NOT the friend's ID.
                 */
                currentUserId={
                  userId
                }

                /*
                 * Friend's post cannot
                 * be edited or deleted from here.
                 */
                onEdit={() => {}}
                onDelete={() => {}}

                /*
                 * Open Challenges tab
                 * for linked challenges.
                 */
                onOpenLinkedChallenge={() =>
                  router.push(
                    '/(tabs)/challenges'
                  )
                }

                /*
                 * REACTIONS
                 */
                reaction={
                  reactions.get(
                    post.id
                  ) ??
                  EMPTY_REACTION
                }

                onReact={(
                  kind
                ) =>
                  handleReact(
                    post.id,
                    kind
                  )
                }

                /*
                 * JOIN
                 */
                join={
                  joins.get(
                    post.id
                  ) ??
                  EMPTY_JOIN
                }

                onToggleJoin={() =>
                  handleJoinToggle(
                    post
                  )
                }

                /*
                 * CHALLENGE
                 */
                onOpenChallenge={() =>
                  handleOpenChallenge(
                    post
                  )
                }

                /*
                 * COMMENTS
                 */
                commentCount={
                  commentCounts.get(
                    post.id
                  ) ?? 0
                }

                commentsExpanded={
                  expandedPostId ===
                  post.id
                }

                onToggleComments={() =>
                  handleToggleComments(
                    post.id
                  )
                }

                comments={
                  expandedPostId ===
                  post.id
                    ? comments
                    : []
                }

                loadingComments={
                  loadingComments
                }

                commentDraft={
                  commentDraft
                }

                onChangeCommentDraft={
                  setCommentDraft
                }

                onSubmitComment={() =>
                  handleAddComment(
                    post
                  )
                }

                postingComment={
                  postingComment
                }

                onDeleteComment={
                  handleDeleteComment
                }
              />
            )
          )}
          </View>
        ) : (
          <View
            style={
              styles.postCard
            }
          >
            <Text
              style={
                styles.noPostsText
              }
            >
              No posts yet
            </Text>
          </View>
        )}

      </ScrollView>

      {/* =====================================================
          CHALLENGE MODAL
          ===================================================== */}

      <ChallengeFriendModal
        visible={
          !!challengeTarget
        }
        friendName={
          challengeTarget?.name ??
          displayName
        }
        challenges={
          open1v1
        }
        loading={
          loadingChallenges
        }
        onClose={() =>
          setChallengeTarget(
            null
          )
        }
        onConfirm={
          handleConfirmChallenge
        }
      />

      {/* =====================================================
          FRIEND LIST
          ===================================================== */}

      <FriendListModal
        visible={friendListVisible}
        friends={friends}
        onClose={() =>
          setFriendListVisible(false)
        }
        onFriendPress={(friend) => {
          setFriendListVisible(false);
          router.push(`/friend/${friend.id}`);
        }}
      />

    </SafeAreaView>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  // =======================================================
  // PROFILE
  // =======================================================

  profileCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 4,
    paddingTop: 20,
    paddingBottom: 16,
  },

  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  avatarWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AVATAR_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },

  name: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
    marginTop: 12,
  },

  levelText: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 4,
  },

  xpBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginTop: 12,
  },

  xpTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#D6E8F5',
    overflow: 'hidden',
  },

  xpFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#4A90D9',
  },

  xpLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
  },

  // =======================================================
  // STATS
  // =======================================================

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    marginHorizontal: 16,
  },

  statPill: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },

  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  statLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
  },

  // =======================================================
  // CARD
  // =======================================================

  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  cardMeta: {
    fontSize: 12,
    color: TEXT_MUTED,
  },

  // =======================================================
  // FRIENDS
  // =======================================================

  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },

  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: CARD,
    marginLeft: -8,
  },

  friendAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  noFriendsText: {
    fontSize: 13,
    color: TEXT_MUTED,
  },

  // =======================================================
  // BADGES
  // =======================================================

  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  badgeEmoji: {
    fontSize: 13,
  },

  badgeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  placeholder: {
    fontSize: 13,
    color: TEXT_MUTED,
  },

  // =======================================================
  // POSTS
  // =======================================================

  postsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
    letterSpacing: 0.3,
  },

  postsLoading: {
    paddingVertical: 20,
  },

  postsListWrap: {
    marginHorizontal: 16,
  },

  /*
   * Only used for the "No posts yet" state.
   *
   * Actual posts are rendered by PostCard.
   */
  postCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },

  noPostsText: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    paddingVertical: 10,
  },

  // =======================================================
  // LOADING / ERROR
  // =======================================================

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    fontSize: 15,
    color: TEXT_MUTED,
  },
});