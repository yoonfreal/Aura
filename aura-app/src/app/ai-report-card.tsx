import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useUserStore } from '@/store/userStore';
import { xpForLevel } from '@/lib/level';
import type { WeeklyStats, User } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportData {
  avgSteps: number;
  stepsUp: boolean;
  stepsChangeAbs: number;
  strongestDay: string;
  xpNeeded: number;
  nextLevel: number;
  activeDays: number;
  calChangeAbs: number;
  calUp: boolean;
  weakDayText: string | null;
  calPerDay: number;
  xpProgress: number;
  barData: { day: string; xp: number }[];
  stepGoal: number;
  missionsNeeded: number;
  focusItems: { text: string; sub: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekLabel(): string {
  const today = new Date();
  const dow = today.getDay();
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - ((dow + 6) % 7));
  const prevMonday = new Date(currentMonday);
  prevMonday.setDate(currentMonday.getDate() - 7);
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = prevMonday.getFullYear();
  const sameMonth = prevMonday.getMonth() === prevSunday.getMonth();
  return sameMonth
    ? `Week of ${months[prevMonday.getMonth()]} ${prevMonday.getDate()} – ${prevSunday.getDate()}, ${year}`
    : `Week of ${months[prevMonday.getMonth()]} ${prevMonday.getDate()} – ${months[prevSunday.getMonth()]} ${prevSunday.getDate()}, ${year}`;
}

function buildReport(stats: WeeklyStats | null, user: User | null): ReportData {
  const avgSteps = stats?.avgSteps ?? 8500;
  const totalCalories = stats?.totalCalories ?? 2100;
  const stepsChange = stats?.avgStepsVsLastWeek ?? 12;
  const calChange = stats?.caloriesVsLastWeek ?? 8;
  const xpNeeded = user ? Math.max(0, user.xpForNextLevel - user.xp) : 55;
  const nextLevel = (user?.level ?? 1) + 1;
  const defaultBars = [
    { day: 'Mon', xp: 30 }, { day: 'Tue', xp: 55 }, { day: 'Wed', xp: 80 },
    { day: 'Thu', xp: 45 }, { day: 'Fri', xp: 60 }, { day: 'Sat', xp: 0 }, { day: 'Sun', xp: 0 },
  ];
  const barData = stats?.barData?.length ? stats.barData : defaultBars;
  const strongestDay = barData.reduce((best, d) => d.xp > best.xp ? d : best, barData[0]).day;
  const weakDays = barData.filter(d => d.xp === 0).map(d => d.day);
  const activeDays = barData.filter(d => d.xp > 0).length;
  const levelStart = user ? xpForLevel(user.level) : 0;
  const levelEnd = user ? user.xpForNextLevel : 100;
  const xpProgress = user
    ? Math.min(1, Math.max(0, (user.xp - levelStart) / (levelEnd - levelStart)))
    : 0.6;
  const weakDayText = weakDays.length >= 2
    ? weakDays.slice(0, 2).join(' and ')
    : weakDays.length === 1 ? weakDays[0] : null;

  // Personalized step goal: round up to the next 500 above current avg
  const stepGoal = Math.max(5000, Math.ceil((avgSteps + 500) / 500) * 500);
  // Estimate missions needed: each mission earns ~25 XP on average
  const missionsNeeded = Math.ceil(xpNeeded / 25);

  const focusItems: { text: string; sub: string }[] = [];

  // 1. Step goal — personalized, not a fixed 5,000
  focusItems.push({
    text: `Push to ${stepGoal.toLocaleString()} steps daily`,
    sub: `You averaged ${avgSteps.toLocaleString()} — a small stretch goes a long way`,
  });

  // 2. Weak day fix — data-driven
  if (weakDayText) {
    focusItems.push({
      text: `Get moving on ${weakDayText}`,
      sub: 'Even a 10-min walk counts — rest days kill your streak',
    });
  } else {
    focusItems.push({
      text: 'Maintain your 7-day activity streak',
      sub: 'You were active every day — keep the chain unbroken',
    });
  }

  // 3. Calorie target — based on actual weekly burn
  const calTarget = Math.round(Math.round(totalCalories / 7) * 1.1 / 50) * 50;
  focusItems.push({
    text: `Burn ${calTarget} cal on at least 4 days`,
    sub: `Up ~10% from your ${Math.round(totalCalories / 7)} cal daily average`,
  });

  // 4. XP / level-up — with mission context
  focusItems.push({
    text: `${xpNeeded} XP to reach Level ${nextLevel}`,
    sub: `About ${missionsNeeded} mission${missionsNeeded !== 1 ? 's' : ''} away — finish your dailies`,
  });

  return {
    avgSteps, stepsUp: (stepsChange ?? 12) >= 0,
    stepsChangeAbs: Math.abs(stepsChange ?? 12),
    strongestDay, xpNeeded, nextLevel, activeDays,
    calChangeAbs: Math.abs(calChange ?? 8),
    calUp: (calChange ?? 8) >= 0,
    weakDayText, calPerDay: Math.round(totalCalories / 7),
    xpProgress, barData, stepGoal, missionsNeeded, focusItems,
  };
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────

const BAR_H = 36;

function MiniBarChart({ barData }: { barData: { day: string; xp: number }[] }) {
  const maxXp = Math.max(...barData.map(b => b.xp), 1);
  return (
    <View style={bar.wrap}>
      {barData.map((b) => {
        const isTop = b.xp === maxXp && b.xp > 0;
        const isEmpty = b.xp === 0;
        return (
          <View key={b.day} style={bar.col}>
            <View style={bar.track}>
              <View style={[
                bar.fill,
                { height: BAR_H * (b.xp / maxXp) || 3 },
                isTop && bar.fillTop,
                isEmpty && bar.fillEmpty,
              ]} />
            </View>
            <Text style={[bar.label, isEmpty && bar.labelDim]}>{b.day}</Text>
          </View>
        );
      })}
    </View>
  );
}

const bar = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 16 },
  col: { flex: 1, alignItems: 'center' },
  track: { height: BAR_H, justifyContent: 'flex-end' },
  fill: { width: 18, borderRadius: 5, backgroundColor: '#C7D4E3' },
  fillTop: { backgroundColor: '#1B2B4B' },
  fillEmpty: { backgroundColor: '#EEF0F3', height: 3 },
  label: { fontSize: 9, color: '#8A9BB0', fontWeight: '600', marginTop: 5 },
  labelDim: { color: '#C4CBD5' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AIReportCardScreen() {
  const insets = useSafeAreaInsets();
  const { user, weeklyStats } = useUserStore();
  const d = buildReport(weeklyStats, user);
  const weekLabel = getWeekLabel();

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#1B2B4B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI report Card</Text>
          <Text style={styles.headerSub}>{weekLabel}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="person-add-outline" size={20} color="#1B2B4B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="chatbubble-outline" size={20} color="#1B2B4B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces
      >

        {/* ── Card 1: Featured summary ── */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconBubble}>
              <Ionicons name="stats-chart" size={17} color="#16A34A" />
            </View>
            <Text style={styles.cardLabel}>Weekly Summary</Text>
          </View>

          <View style={styles.featuredStat}>
            <View>
              <Text style={styles.bigNum}>{d.avgSteps.toLocaleString()}</Text>
              <Text style={styles.bigNumLabel}>avg steps / day</Text>
            </View>
            <View style={[styles.trendBubble, { backgroundColor: d.stepsUp ? '#DCFCE7' : '#FEE2E2' }]}>
              <Ionicons
                name={d.stepsUp ? 'arrow-up' : 'arrow-down'}
                size={11}
                color={d.stepsUp ? '#16A34A' : '#DC2626'}
              />
              <Text style={[styles.trendText, { color: d.stepsUp ? '#16A34A' : '#DC2626' }]}>
                {d.stepsChangeAbs}%
              </Text>
            </View>
          </View>

          <MiniBarChart barData={d.barData} />

          <View style={styles.summaryFooter}>
            <Text style={styles.summaryNote}>
              <Text style={styles.summaryNoteBold}>{d.strongestDay}</Text>
              {' was your best day  ·  '}
              <Text style={styles.summaryNoteBold}>{d.activeDays} of 7</Text>
              {' days active'}
            </Text>
          </View>
        </View>

        {/* ── Card 2: What improved ── */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBubble, { backgroundColor: '#CCFBF1' }]}>
              <Text style={styles.emojiIcon}>💪</Text>
            </View>
            <Text style={styles.cardLabel}>What Improved</Text>
          </View>

          <View style={styles.metricsRow}>
            {[
              { value: `+${d.stepsChangeAbs}%`, label: 'Steps', color: '#16A34A' },
              { value: `${d.activeDays}/7`, label: 'Active days', color: '#1B2B4B' },
              { value: `+${d.calChangeAbs}%`, label: 'Calories', color: '#D97706' },
            ].map((m, i) => (
              <View key={i} style={[styles.metricCol, i === 1 && styles.metricColMid]}>
                <Text style={[styles.metricVal, { color: m.color }]}>{m.value}</Text>
                <Text style={styles.metricLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Card 3: Needs work ── */}
        <View style={[styles.card, styles.cardWarm]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBubble, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="warning" size={17} color="#D97706" />
            </View>
            <Text style={styles.cardLabel}>Needs Work</Text>
          </View>
          <Text style={styles.bodyText}>
            {d.weakDayText ? (
              <>
                <Text style={styles.bodyBold}>{d.weakDayText}</Text>
                {' had only one recorded activity. Try a light walk on rest days to keep your goal alive.'}
              </>
            ) : (
              <>
                {'Great consistency! Aim to '}
                <Text style={styles.bodyBold}>stay active every day</Text>
                {' to build an unbreakable streak next week.'}
              </>
            )}
          </Text>
        </View>

        {/* ── Card 4: Focus ── */}
        <View style={[styles.card, styles.cardDark]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBubble, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <Text style={styles.emojiIcon}>🎯</Text>
            </View>
            <Text style={[styles.cardLabel, styles.cardLabelLight]}>This Week's Focus</Text>
          </View>

          {d.focusItems.map((item, i) => (
            <View key={i} style={[styles.focusItem, i < d.focusItems.length - 1 && styles.focusItemBorder]}>
              <View style={styles.focusDotWrap}>
                <View style={styles.focusDot} />
              </View>
              <View style={styles.focusTextWrap}>
                <Text style={styles.focusText}>{item.text}</Text>
                <Text style={styles.focusSub}>{item.sub}</Text>
              </View>
            </View>
          ))}

          <View style={styles.xpRow}>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${Math.round(d.xpProgress * 100)}%` }]} />
            </View>
            <Text style={styles.xpLabel}>
              {`Level ${(d.nextLevel) - 1}  `}
              <Text style={styles.xpLabelGold}>{Math.round(d.xpProgress * 100)}%</Text>
              {`  → Lv ${d.nextLevel}`}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>AI-generated · Not medical advice</Text>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F6F9' },

  // Header — identical to HomeScreen header style
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: '#F2F6F9',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
    ...SHADOW,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1B2B4B', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: '#8A9BB0', fontWeight: '500', marginTop: 1 },
  headerIcons: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW,
  },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 14, paddingBottom: 48, gap: 12 },

  // Card base
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    ...SHADOW,
  },
  cardWarm: { backgroundColor: '#FFFBEB' },
  cardDark: { backgroundColor: '#1B2B4B' },

  // Card inner reuse
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#1B2B4B' },
  cardLabelLight: { color: '#FFFFFF' },
  iconBubble: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center',
  },
  emojiIcon: { fontSize: 16, lineHeight: 20 },

  // Featured stat
  featuredStat: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bigNum: {
    fontSize: 48, fontWeight: '800', color: '#1B2B4B',
    letterSpacing: -1.5, lineHeight: 52,
  },
  bigNumLabel: { fontSize: 12, color: '#8A9BB0', fontWeight: '500', marginTop: 3 },
  trendBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
    marginBottom: 4,
  },
  trendText: { fontSize: 13, fontWeight: '700' },

  summaryFooter: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
    paddingTop: 10,
  },
  summaryNote: { fontSize: 12, color: '#8A9BB0', fontWeight: '500', lineHeight: 18 },
  summaryNoteBold: { fontWeight: '700', color: '#1B2B4B' },

  // Metrics trio
  metricsRow: { flexDirection: 'row' },
  metricCol: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  metricColMid: {
    borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: '#F0F4F8',
    marginHorizontal: 4,
  },
  metricVal: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  metricLabel: { fontSize: 11, color: '#8A9BB0', fontWeight: '600', marginTop: 3 },

  // Body text (warm card)
  bodyText: { fontSize: 14, color: '#78350F', lineHeight: 22, fontWeight: '400' },
  bodyBold: { fontWeight: '700', color: '#92400E' },

  // Focus card (dark)
  focusItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 12, paddingVertical: 11,
  },
  focusItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  focusDotWrap: { paddingTop: 5 },
  focusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F5B800' },
  focusTextWrap: { flex: 1 },
  focusText: { fontSize: 14, color: '#E2E8F0', fontWeight: '600', lineHeight: 20 },
  focusSub: { fontSize: 12, color: '#64748B', fontWeight: '400', marginTop: 2, lineHeight: 17 },

  xpRow: { marginTop: 14, gap: 7 },
  xpTrack: {
    height: 5, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3, overflow: 'hidden',
  },
  xpFill: { height: '100%', backgroundColor: '#F5B800', borderRadius: 3 },
  xpLabel: { fontSize: 11, color: '#475569', fontWeight: '500', textAlign: 'center' },
  xpLabelGold: { color: '#F5B800', fontWeight: '700' },

  footer: {
    textAlign: 'center', fontSize: 11,
    color: '#C4CBD5', fontWeight: '400', marginTop: 4,
  },
});
