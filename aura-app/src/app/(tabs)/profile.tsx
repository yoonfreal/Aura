import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Share2, Pencil, Lock, UserCog, Settings, Shield, HelpCircle, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import { getLevelTitle } from '@/lib/level';
import { useRouter } from 'expo-router';

const BG = '#E7ECF5';
const CARD = '#FFFFFF';
const BORDER = '#E3E7F0';
const TEXT_DARK = '#1E2430';
const TEXT_MUTED = '#8A93A6';
const AVATAR_GREEN = '#2F5D4E';
const SHARE_NAVY = '#1B2A41';
const GOLD = '#F4B942';
const GOLD_PILL = '#EFC988';
const GOLD_PILL_TEXT = '#8A5A1E';
const FLAME_ORANGE = '#F5822A';
const MEDAL_RED = '#E0552B';
const ICON_BG_PEACH = '#FBDCC8';
const RING_TRACK = '#D3DAE6';
const SIGN_OUT_RED = '#E53935';
const FRIEND_AVATAR_COLORS = ['#2F5D4E', '#3E6B8A', '#8A5A1E', '#5D4E8A', '#8A2E4E'];

type Badge = { label: string; icon: string; earned: boolean };

const BADGES: Badge[] = [
  { label: '7-day Streak', icon: '🔥', earned: true },
  { label: 'Top 15', icon: '🏅', earned: true },
  { label: '10K Steps', icon: '👟', earned: true },
  { label: 'Early Bird', icon: '🌅', earned: false },
  { label: 'Iron Will', icon: '💪', earned: false },
];

type Friend = { name: string; active?: boolean };


const FRIENDS: Friend[] = [
  { name: 'Alex', active: true },
  { name: 'Maria', active: true },
  { name: 'Sam' },
  { name: 'Priya', active: true },
  { name: 'Leo' },
];
const FRIEND_COUNT = 142;

function FriendAvatar({ name, color, first }: { name: string; color: string; first?: boolean }) {
  return (
    <View style={[styles.friendAvatar, first && styles.friendAvatar_first, { backgroundColor: color }]}>
      <Text style={styles.friendAvatarInitial}>{name.charAt(0)}</Text>
    </View>
  );
}

function XpRing({ pct, size = 96, stroke = 6 }: { pct: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={RING_TRACK} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={GOLD}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
      />
    </Svg>
  );
}

function StatPill({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <TouchableOpacity style={styles.statPill} activeOpacity={0.7}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useUserStore();

  if (!user) return null;

  const pct = Math.min(100, Math.round((user.xp / user.xpForNextLevel) * 100));
  const earnedCount = BADGES.filter((b) => b.earned).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.shareButton} activeOpacity={0.8}>
            <Share2 size={13} color="#fff" />
            <Text style={styles.shareText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar + identity */}
        <View style={styles.identityBlock}>
          <View style={styles.avatarWrap}>
            <XpRing pct={pct} />
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{user.username.charAt(0).toUpperCase()}</Text>
            </View>
            <TouchableOpacity
              style={styles.avatarEditBadge}
              activeOpacity={0.7}
              onPress={() => router.push('/edit-profile')}
            >
              <Pencil size={12} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.nameRow}
            onPress={() => router.push('/edit-profile')}
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
            Level {user.level} - {getLevelTitle(user.level)}
          </Text>

          <View style={styles.xpBarRow}>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.xpLabel}>
              {user.xp}/{user.xpForNextLevel} XP
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatPill icon="🏆" value={String(user.xp)} label="XP" />
          <StatPill icon="🔥" value={String(user.streak)} label="Streak" />
          <StatPill icon="🎖️" value={String(earnedCount)} label="Badges" />
        </View>

        {/* Friends */}
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Friends</Text>
            <View style={styles.friendsViewAll}>
              <Text style={styles.cardMeta}>{FRIEND_COUNT} friends</Text>
              <ChevronRight size={14} color={TEXT_MUTED} />
            </View>
          </View>
          <View style={styles.friendsRow}>
            {FRIENDS.map((f, i) => (
              <FriendAvatar
                key={f.name}
                name={f.name}
                first={i === 0}
                color={FRIEND_AVATAR_COLORS[i % FRIEND_AVATAR_COLORS.length]}
              />
            ))}
            <View style={styles.friendsMoreCircle}>
              <Text style={styles.friendsMoreText}>+{FRIEND_COUNT - FRIENDS.length}</Text>
            </View>
          </View>
          <Text style={styles.friendsActiveText}>
            {FRIENDS.filter((f) => f.active).length} active today
          </Text>
        </TouchableOpacity>

        {/* Badge collection */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.badgeTitleRow}>
              <Text style={styles.cardTitleCaps}>BADGE COLLECTION</Text>
              <Pencil size={12} color={TEXT_MUTED} />
            </View>
            <Text style={styles.badgeCountText}>
              {earnedCount} of {BADGES.length} earned
            </Text>
          </View>
          <View style={styles.badgeWrap}>
            {BADGES.map((b, i) => (
              <View
                key={i}
                style={[styles.badgePill, { backgroundColor: b.earned ? GOLD_PILL : '#EEF0F5' }]}
              >
                {b.earned ? (
                  <Text style={styles.badgeEmoji}>{b.icon}</Text>
                ) : (
                  <Lock size={11} color="#A6ADBB" />
                )}
                <Text style={[styles.badgeLabel, { color: b.earned ? GOLD_PILL_TEXT : '#A6ADBB' }]}>
                  {b.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Menu list */}
        <View style={styles.menuList}>
  <MenuRow
    icon={<UserCog size={18} color={FLAME_ORANGE} />}
    label="Edit Profile"
    onPress={() => router.push('/edit-profile')}
  />

  <MenuRow
    icon={<Settings size={18} color={FLAME_ORANGE} />}
    label="Settings"
    onPress={() => router.push('/settings')}
  />

  <MenuRow
    icon={<Shield size={18} color={MEDAL_RED} />}
    label="Terms and Conditions"
    onPress={() => router.push('/terms')}
  />

  <MenuRow
    icon={<HelpCircle size={18} color={MEDAL_RED} />}
    label="Help & Support"
    onPress={() => router.push('/help')}
  />
</View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOut} onPress={() => supabase.auth.signOut()} activeOpacity={0.85}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

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
      <View style={styles.menuLeft}>
        <View style={styles.menuIconCircle}>
          {icon}
        </View>

        <Text style={styles.menuLabel}>
          {label}
        </Text>
      </View>

      <ChevronRight size={16} color="#B7BECC" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingBottom: 32 },

  headerRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 8 },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SHARE_NAVY,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  shareText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  identityBlock: { alignItems: 'center', paddingHorizontal: 24, marginTop: 4 },
  avatarWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AVATAR_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 28, fontWeight: '700' },
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

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  nameText: { fontSize: 20, fontWeight: '700', color: TEXT_DARK },
  levelText: { fontSize: 14, color: TEXT_MUTED, marginTop: 4 },

  xpBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', marginTop: 12 },
  xpTrack: { flex: 1, height: 8, borderRadius: 999, backgroundColor: RING_TRACK, overflow: 'hidden' },
  xpFill: { height: 8, borderRadius: 999, backgroundColor: GOLD },
  xpLabel: { fontSize: 11, color: TEXT_MUTED },

  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginTop: 16 },
  statPill: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8 },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 18, fontWeight: '700', color: TEXT_DARK },
  statLabel: { fontSize: 10, color: TEXT_MUTED },

  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  cardTitleCaps: { fontSize: 13, fontWeight: '700', color: TEXT_DARK, letterSpacing: 0.3 },
  cardMeta: { fontSize: 11, color: TEXT_MUTED },

  friendsViewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  friendsRow: { flexDirection: 'row', alignItems: 'center' },
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
  friendAvatar_first: { marginLeft: 0 },
  friendAvatarInitial: { color: '#fff', fontSize: 13, fontWeight: '700' },
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
  friendsMoreText: { fontSize: 10, fontWeight: '700', color: TEXT_MUTED },
  friendsActiveText: { fontSize: 12, color: TEXT_MUTED, marginTop: 10 },

  badgeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeCountText: { fontSize: 11, fontWeight: '600', color: GOLD_PILL_TEXT },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  badgeEmoji: { fontSize: 12 },
  badgeLabel: { fontSize: 12, fontWeight: '500' },

  menuList: { paddingHorizontal: 16, marginTop: 16, gap: 10 },
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
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: ICON_BG_PEACH, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '500', color: TEXT_DARK },

  signOut: {
    backgroundColor: SIGN_OUT_RED,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});