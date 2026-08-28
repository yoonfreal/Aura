import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Switch,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  Share2,
  Pencil,
  UserCog,
  Settings,
  Shield,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from 'lucide-react-native';

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { getLevelTitle } from '@/lib/level';
import { fetchBadges, type EarnedBadge } from '@/lib/challenges';
import { CheckInCalendar } from '@/components/CheckInCalendar';
import { FriendListModal } from '@/components/FriendListModal';

const BG = '#F0F4F8';
const CARD = '#FFFFFF';
const BORDER = '#E3E7F0';
const TEXT_DARK = '#1E2430';
const TEXT_MUTED = '#8A93A6';

const AVATAR_GREEN = '#2F5D4E';
const SHARE_NAVY = '#1B2B4B';

const GOLD_PILL = '#FEF3C7';
const GOLD_PILL_TEXT = '#D97706';

const FLAME_ORANGE = '#F5822A';
const MEDAL_RED = '#E0552B';
const ICON_BG_PEACH = '#FBDCC8';

const SIGN_OUT_RED = '#DC2626';

const FRIEND_AVATAR_COLORS = [
  '#1E4D8C',
  '#4A5568',
  '#744210',
  '#065F46',
  '#5B21B6',
];

type FriendProfile = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  level?: number | null;
  last_active_date?: string | null;
};

type FriendshipRow = {
  requester_id: string;
  addressee_id: string;
};

function FriendAvatar({
  name,
  color,
  first,
}: {
  name: string;
  color: string;
  first?: boolean;
}) {
  return (
    <View
      style={[
        styles.friendAvatar,
        first && styles.friendAvatar_first,
        { backgroundColor: color },
      ]}
    >
      <Text style={styles.friendAvatarInitial}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

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
    <TouchableOpacity
      style={styles.statPill}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.statIconWrap,
          { backgroundColor: iconBg },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={iconColor}
        />
      </View>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* =========================================================
   BADGE VISIBILITY
   ========================================================= */

function BadgeVisibilityModal({
  visible,
  badges,
  hiddenBadges,
  onToggle,
  onClose,
}: {
  visible: boolean;
  badges: EarnedBadge[];
  hiddenBadges: string[];
  onToggle: (label: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.modalBackButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={TEXT_DARK} />
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Show on Profile</Text>

          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.badgeEditHint}>
          Choose which earned badges appear in your Badge Collection.
        </Text>

        <FlatList
          data={badges}
          keyExtractor={(item) => item.label}
          contentContainerStyle={styles.badgeEditList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.noFriendsText}>
              You haven&apos;t earned any badges yet.
            </Text>
          }
          renderItem={({ item }) => {
            const isVisible = !hiddenBadges.includes(item.label);

            return (
              <View style={styles.badgeEditRow}>
                <View
                  style={[
                    styles.badgeEditIconWrap,
                    { backgroundColor: GOLD_PILL },
                  ]}
                >
                  <Text style={styles.badgeEmoji}>
                    {item.icon}
                  </Text>
                </View>

                <View style={styles.badgeEditInfo}>
                  <Text style={styles.badgeEditLabel}>
                    {item.label}
                  </Text>
                </View>

                <Switch
                  value={isVisible}
                  onValueChange={() => onToggle(item.label)}
                  trackColor={{
                    false: '#D9DEE7',
                    true: '#4A90D9',
                  }}
                  thumbColor="#FFFFFF"
                />
              </View>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

/* =========================================================
   PROFILE
   ========================================================= */

export default function ProfileScreen() {
  const router = useRouter();

  const { user } = useUserStore();

  const [friends, setFriends] =
    useState<FriendProfile[]>([]);

  const [friendCount, setFriendCount] =
    useState(0);

  const [friendListVisible, setFriendListVisible] =
    useState(false);

  const [badges, setBadges] =
    useState<EarnedBadge[]>([]);

  const [badgesExpanded, setBadgesExpanded] =
    useState(true);

  const [hiddenBadges, setHiddenBadges] =
    useState<string[]>([]);

  const [badgeEditVisible, setBadgeEditVisible] =
    useState(false);

  useEffect(() => {
    if (!user?.id) {
      setHiddenBadges([]);
      return;
    }

    AsyncStorage.getItem(
      `hidden_badges_${user.id}`
    )
      .then((stored) => {
        setHiddenBadges(
          stored ? JSON.parse(stored) : []
        );
      })
      .catch(() => setHiddenBadges([]));
  }, [user?.id]);

  const toggleBadgeVisibility = useCallback(
    (label: string) => {
      if (!user?.id) return;

      setHiddenBadges((prev) => {
        const next = prev.includes(label)
          ? prev.filter(
              (item) => item !== label
            )
          : [...prev, label];

        AsyncStorage.setItem(
          `hidden_badges_${user.id}`,
          JSON.stringify(next)
        ).catch(() => {});

        return next;
      });
    },
    [user?.id]
  );

  const loadBadges = useCallback(async () => {
    if (!user?.id) {
      setBadges([]);
      return;
    }

    try {
      setBadges(await fetchBadges(user.id));
    } catch (error) {
      console.error('Error loading badges:', error);
      setBadges([]);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadBadges();
    }, [loadBadges])
  );

  const fetchFriends = useCallback(async () => {
    if (!user?.id) {
      setFriends([]);
      setFriendCount(0);
      return;
    }

    try {
      /*
       * ONLY accepted friendships.
       *
       * The current user can be either:
       * - requester
       * - addressee
       */
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
          `requester_id.eq.${user.id},addressee_id.eq.${user.id}`
        );

      if (friendshipError) {
        console.error(
          'Error loading friendships:',
          friendshipError
        );

        setFriends([]);
        setFriendCount(0);
        return;
      }

      const rows =
        (friendshipRows ??
          []) as FriendshipRow[];

      /*
       * Get the other user's ID from
       * each accepted friendship.
       */
      const friendIds = rows
        .map((friendship) => {
          if (
            friendship.requester_id ===
            user.id
          ) {
            return friendship.addressee_id;
          }

          return friendship.requester_id;
        })
        .filter(
          (id, index, array) =>
            id &&
            array.indexOf(id) === index
        );

      setFriendCount(friendIds.length);

      if (friendIds.length === 0) {
        setFriends([]);
        return;
      }

      /*
       * Get the actual friend profiles.
       */
      const {
        data: profileRows,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(
          `
          id,
          username,
          first_name,
          last_name,
          level,
          last_active_date
          `
        )
        .in('id', friendIds);

      if (profileError) {
        console.error(
          'Error loading friend profiles:',
          profileError
        );

        setFriends([]);
        return;
      }

      /*
       * Keep the order consistent with the
       * friendship IDs.
       */
      const profileMap = new Map(
        (profileRows ?? []).map(
          (profile) => [
            profile.id,
            profile,
          ]
        )
      );

      const orderedFriends =
        friendIds
          .map((id) =>
            profileMap.get(id)
          )
          .filter(
            Boolean
          ) as FriendProfile[];

      setFriends(orderedFriends);
    } catch (error) {
      console.error(
        'Unexpected error loading friends:',
        error
      );

      setFriends([]);
      setFriendCount(0);
    }
  }, [user]);

  /*
   * Refresh whenever Profile becomes active.
   */
  useFocusEffect(
    useCallback(() => {
      fetchFriends();
    }, [fetchFriends])
  );

  if (!user) {
    return null;
  }

  const pct = Math.min(
    100,
    Math.round(
      (user.xp / user.xpForNextLevel) *
        100
    )
  );

  const earnedCount =
    badges.filter(
      (badge) => badge.earned
    ).length;

  const earnedBadges = badges.filter(
    (badge) => badge.earned
  );

  const visibleBadges = earnedBadges.filter(
    (badge) => !hiddenBadges.includes(badge.label)
  );

  /*
   * Show up to 5 friend avatars on Profile.
   */
  const displayedFriends =
    friends.slice(0, 5);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + identity + stats */}
        <View style={styles.profileCard}>
        <TouchableOpacity
          style={styles.shareButton}
          activeOpacity={0.8}
        >
          <Share2
            size={13}
            color="#fff"
          />

          <Text style={styles.shareText}>
            Share
          </Text>
        </TouchableOpacity>

        <View
          style={styles.identityBlock}
        >
          <View style={styles.avatarWrap}>
            <XpRing pct={pct} />

            <View
              style={styles.avatarCircle}
            >
              <Text
                style={styles.avatarInitial}
              >
                {user.username
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.avatarEditBadge
              }
              activeOpacity={0.7}
              onPress={() =>
                router.push(
                  '/edit-profile'
                )
              }
            >
              <Pencil
                size={12}
                color={TEXT_DARK}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.nameRow}
            onPress={() =>
              router.push(
                '/edit-profile'
              )
            }
            activeOpacity={0.7}
          >
            <Text style={styles.nameText}>
              {user.username}
            </Text>

            <Pencil
              size={14}
              color={TEXT_DARK}
            />
          </TouchableOpacity>

          <Text style={styles.levelText}>
            Level {user.level} -{' '}
            {getLevelTitle(user.level)}
          </Text>

          <View
            style={styles.xpBarRow}
          >
            <View
              style={styles.xpTrack}
            >
              <View
                style={[
                  styles.xpFill,
                  {
                    width: `${pct}%`,
                  },
                ]}
              />
            </View>

            <Text
              style={styles.xpLabel}
            >
              {user.xp}/
              {user.xpForNextLevel} XP
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatPill
            icon="trophy"
            iconColor="#D97706"
            iconBg="#FEF3C7"
            value={String(user.xp)}
            label="XP"
          />

          <StatPill
            icon="flame"
            iconColor="#DC2626"
            iconBg="#FEE2E2"
            value={String(
              user.streak
            )}
            label="Streak"
          />

          <StatPill
            icon="medal"
            iconColor={MEDAL_RED}
            iconBg={ICON_BG_PEACH}
            value={String(
              earnedCount
            )}
            label="Badges"
          />
        </View>
        </View>

        {/* =================================================
            FRIENDS CARD
            Clicking this opens ONLY accepted friends.
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
              style={styles.cardTitle}
            >
              Friends
            </Text>

            <View
              style={
                styles.friendsViewAll
              }
            >
              <Text
                style={styles.cardMeta}
              >
                {friendCount} friends
              </Text>

              <ChevronRight
                size={14}
                color={TEXT_MUTED}
              />
            </View>
          </View>

          {displayedFriends.length >
          0 ? (
              <View
                style={styles.friendsRow}
              >
                {displayedFriends.map(
                  (
                    friend,
                    index
                  ) => {
                    const displayName =
                      friend.username ||
                      friend.first_name ||
                      'Friend';

                    return (
                      <FriendAvatar
                        key={
                          friend.id
                        }
                        name={
                          displayName
                        }
                        first={
                          index ===
                          0
                        }
                        color={
                          FRIEND_AVATAR_COLORS[
                            index %
                              FRIEND_AVATAR_COLORS.length
                          ]
                        }
                      />
                    );
                  }
                )}

                {friendCount >
                  5 && (
                  <View
                    style={
                      styles.friendsMoreCircle
                    }
                  >
                    <Text
                      style={
                        styles.friendsMoreText
                      }
                    >
                      +
                      {friendCount -
                        5}
                    </Text>
                  </View>
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

        {/* Gym check-ins */}
        <Text style={[styles.cardTitleCaps, { marginHorizontal: 16, marginTop: 16 }]}>GYM CHECK-INS</Text>
        <CheckInCalendar userId={user.id} />

        {/* Badge collection */}
        <View style={styles.card}>
          <View
            style={
              styles.cardHeaderRow
            }
          >
            <View
              style={
                styles.badgeTitleRow
              }
            >
              <Text
                style={
                  styles.cardTitleCaps
                }
              >
                BADGE COLLECTION
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setBadgeEditVisible(true)
                }
                activeOpacity={0.7}
                hitSlop={8}
              >
                <Pencil
                  size={12}
                  color={TEXT_MUTED}
                />
              </TouchableOpacity>
            </View>
          </View>

          {visibleBadges.length > 0 ? (
            <View
              style={styles.badgeWrap}
            >
              {visibleBadges.map(
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
                      {
                        badge.icon
                      }
                    </Text>

                    <Text
                      style={[
                        styles.badgeLabel,
                        { color: GOLD_PILL_TEXT },
                      ]}
                    >
                      {
                        badge.label
                      }
                    </Text>
                  </View>
                )
              )}
            </View>
          ) : earnedBadges.length > 0 ? (
            <Text style={styles.noFriendsText}>
              No badges selected — tap the pencil to
              choose which ones to show.
            </Text>
          ) : (
            <Text style={styles.noFriendsText}>
              No badges earned yet.
            </Text>
          )}
        </View>

        {/* Menu */}
        <View style={styles.menuList}>
          <MenuRow
            icon={
              <UserCog
                size={18}
                color={
                  FLAME_ORANGE
                }
              />
            }
            label="Edit Profile"
            onPress={() =>
              router.push(
                '/edit-profile'
              )
            }
          />

          <MenuRow
            icon={
              <Settings
                size={18}
                color={
                  FLAME_ORANGE
                }
              />
            }
            label="Settings"
            onPress={() =>
              router.push(
                '/settings'
              )
            }
          />

          <MenuRow
            icon={
              <Shield
                size={18}
                color={
                  MEDAL_RED
                }
              />
            }
            label="Terms and Conditions"
            onPress={() =>
              router.push(
                '/terms'
              )
            }
          />

          <MenuRow
            icon={
              <HelpCircle
                size={18}
                color={
                  MEDAL_RED
                }
              />
            }
            label="Help & Support"
            onPress={() =>
              router.push(
                '/help'
              )
            }
          />
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOut}
          onPress={async () => {
            await supabase.auth.signOut();
          }}
          activeOpacity={0.85}
        >
          <Text
            style={
              styles.signOutText
            }
          >
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Friend List */}
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

      {/* Badge Visibility */}
      <BadgeVisibilityModal
        visible={badgeEditVisible}
        badges={earnedBadges}
        hiddenBadges={hiddenBadges}
        onToggle={toggleBadgeVisibility}
        onClose={() => setBadgeEditVisible(false)}
      />
    </SafeAreaView>
  );
}

/* =========================================================
   MENU ROW
   ========================================================= */

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.menuRow}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        style={styles.menuLeft}
      >
        <View
          style={
            styles.menuIconCircle
          }
        >
          {icon}
        </View>

        <Text
          style={styles.menuLabel}
        >
          {label}
        </Text>
      </View>

      <ChevronRight
        size={16}
        color="#B7BECC"
      />
    </TouchableOpacity>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },

  scrollContent: {
    paddingBottom: 32,
  },

  shareButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SHARE_NAVY,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  shareText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  profileCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 16,
    paddingTop: 20,
    paddingBottom: 16,
    position: 'relative',
  },

  identityBlock: {
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

  avatarInitial: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },

  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 2,
    borderColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },

  nameText: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
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

  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  cardTitleCaps: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
    letterSpacing: 0.3,
  },

  cardMeta: {
    fontSize: 11,
    color: TEXT_MUTED,
  },

  friendsViewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: CARD,
    marginLeft: -10,
  },

  friendAvatar_first: {
    marginLeft: 0,
  },

  friendAvatarInitial: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  friendsMoreCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF0F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: CARD,
    marginLeft: -10,
  },

  friendsMoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_MUTED,
  },

  noFriendsText: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

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
    paddingVertical: 6,
    borderRadius: 999,
  },

  badgeEmoji: {
    fontSize: 12,
  },

  badgeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  menuList: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  menuIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ICON_BG_PEACH,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_DARK,
  },

  signOut: {
    backgroundColor: SIGN_OUT_RED,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  signOutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  /* =====================================================
     BADGE VISIBILITY MODAL
     ===================================================== */

  modalContainer: {
    flex: 1,
    backgroundColor: BG,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  modalBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  badgeEditHint: {
    fontSize: 13,
    color: TEXT_MUTED,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },

  badgeEditList: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  badgeEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },

  badgeEditIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeEditInfo: {
    flex: 1,
    marginLeft: 12,
  },

  badgeEditLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
  },

});
