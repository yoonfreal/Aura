import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { xpAtLevelStart } from '@/lib/level';
import { thailandWeekRange } from '@/lib/thailandTime';
import { fetchWeeklyStats } from '@/lib/api';
import { fetchReportInsight, type ReportInsight } from '@/lib/claude';
import type { WeeklyStats, User } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportData {
  avgSteps: number;
  stepsUp: boolean;
  stepsChangeAbs: number;
  // null = no prior week to compare against (new/inactive account) — distinct from a
  // real 0% flat week, and shown honestly rather than folded into a fake "+0%".
  stepsChange: number | null;
  strongestDay: string;
  xpNeeded: number;
  nextLevel: number;
  activeDays: number;
  calChangeAbs: number;
  calUp: boolean;
  calChange: number | null;
  weakDayText: string | null;
  calPerDay: number;
  xpProgress: number;
  barData: { day: string; xp: number }[];
  stepGoal: number;
  missionsNeeded: number;
  focusItems: { text: string; sub: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Labels the same Thailand-local Mon–Sun window that fetchWeeklyStats(-1) actually queries
// — computed from that same window rather than the device's own local calendar, so the
// label always matches the data shown regardless of what timezone the device is set to.
function getWeekLabel(): string {
  const { start, end } = thailandWeekRange(-1);
  const [startYear, startMonth, startDay] = start.split('-').map(Number);
  const [endYear, endMonth, endDay] = end.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sameMonth = startMonth === endMonth;
  return sameMonth
    ? `Week of ${months[startMonth - 1]} ${startDay} – ${endDay}, ${endYear}`
    : `Week of ${months[startMonth - 1]} ${startDay} – ${months[endMonth - 1]} ${endDay}, ${endYear}`;
}

// Called only once weeklyStats has actually loaded (see the loading gate in the screen
// below) — every number here is real, computed from the caller's own weekly activity.
function buildReport(stats: WeeklyStats, user: User | null): ReportData {
  const avgSteps = stats.avgSteps;
  const totalCalories = stats.totalCalories;
  // null means "no prior week to compare against" (e.g. a brand-new account) — kept as
  // null through to the UI rather than collapsed into a misleading "+0%".
  const stepsChange = stats.avgStepsVsLastWeek;
  const calChange = stats.caloriesVsLastWeek;
  const xpNeeded = user ? Math.max(0, user.xpForNextLevel - user.xp) : 0;
  const nextLevel = (user?.level ?? 1) + 1;
  const barData = stats.barData;
  const strongestDay = barData.reduce((best, d) => d.xp > best.xp ? d : best, barData[0]).day;
  const weakDays = barData.filter(d => d.xp === 0).map(d => d.day);
  const activeDays = barData.filter(d => d.xp > 0).length;
  const levelStart = user ? xpAtLevelStart(user.level) : 0;
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

  // No prior week to compare against: treat "went from nothing to something" as +100%
  // (the standard convention — Strava/Fitbit do the same), rather than a fake "+0%" or an
  // undefined percentage. If this week is also still at zero, there's genuinely nothing to
  // report either way, so 0% there is accurate, not a placeholder.
  const stepsUp = stepsChange !== null ? stepsChange >= 0 : avgSteps > 0;
  const stepsChangeAbs = stepsChange !== null ? Math.abs(stepsChange) : (avgSteps > 0 ? 100 : 0);
  const calUp = calChange !== null ? calChange >= 0 : totalCalories > 0;
  const calChangeAbs = calChange !== null ? Math.abs(calChange) : (totalCalories > 0 ? 100 : 0);

  return {
    avgSteps, stepsUp, stepsChangeAbs, stepsChange,
    strongestDay, xpNeeded, nextLevel, activeDays,
    calChangeAbs, calUp, calChange,
    weakDayText, calPerDay: Math.round(totalCalories / 7),
    xpProgress, barData, stepGoal, missionsNeeded, focusItems,
  };
}

// ─── Recap renderer ─────────────────────────────────────────────────────────
// Renders the AI's freeform recap text (plain paragraphs, "- " bullet lines, and
// **bold** spans) without forcing it into a fixed layout — its shape follows
// whatever structure Claude chose for that particular week.

function renderInline(text: string, boldStyle: object) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <Text key={i} style={boldStyle}>{part.slice(2, -2)}</Text>
    ) : (
      part
    ),
  );
}

function RecapText({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/).filter(Boolean);
  return (
    <View style={{ gap: 12 }}>
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter(Boolean);
        const isBulletBlock = lines.length > 0 && lines.every((l) => l.trim().startsWith('- '));

        if (isBulletBlock) {
          return (
            <View key={i} style={{ gap: 7 }}>
              {lines.map((line, j) => (
                <View key={j} style={styles.recapBulletRow}>
                  <Text style={styles.recapBulletDot}>•</Text>
                  <Text style={styles.recapText}>
                    {renderInline(line.replace(/^- /, ''), styles.recapBold)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        return (
          <Text key={i} style={styles.recapText}>
            {renderInline(block, styles.recapBold)}
          </Text>
        );
      })}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AIReportCardScreen() {
  const insets = useSafeAreaInsets();
  const { user, weeklyStats, setWeeklyStats } = useUserStore();
  const weekLabel = getWeekLabel();

  const [aiReport, setAiReport] = useState<ReportInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(true);

  // Weekly stats may not be loaded yet if the user opened this screen without first
  // visiting Home's Weekly tab — fetch it here so the AI recap always has real data.
  useEffect(() => {
    if (!user || weeklyStats) return;
    fetchWeeklyStats(user.id).then(setWeeklyStats).catch(() => {});
  }, [user?.id, weeklyStats, setWeeklyStats]);

  useEffect(() => {
    if (!user || !weeklyStats) return;
    let cancelled = false;
    setInsightLoading(true);

    const days = weeklyStats.barData.map((b) => ({
      day: b.day,
      steps: b.steps,
      calories: b.calories,
      xp: b.xp,
    }));

    fetchReportInsight({
      days,
      totalSteps: days.reduce((sum, day) => sum + day.steps, 0),
      totalCalories: weeklyStats.totalCalories,
      totalXpThisWeek: weeklyStats.totalXp,
      avgStepsVsLastWeek: weeklyStats.avgStepsVsLastWeek,
      caloriesVsLastWeek: weeklyStats.caloriesVsLastWeek,
      streakDays: user.streak,
      level: user.level,
      xpNeeded: Math.max(0, user.xpForNextLevel - user.xp),
      nextLevel: user.level + 1,
    }).then((result) => {
      if (!cancelled) {
        setAiReport(result);
        setInsightLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, weeklyStats]);

  // Wait for real weekly stats AND the AI recap/recommendations before showing anything —
  // otherwise "What Improved" and "This Week's Focus" would render immediately off local
  // fallback data while only the recap card waited, so the page would visibly flash from
  // template content to AI content instead of appearing all at once.
  if (!weeklyStats || insightLoading) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#1B2B4B" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>AI report Card</Text>
            <Text style={styles.headerSub}>{weekLabel}</Text>
          </View>
          <View style={{ width: 80 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#1B2B4B" />
        </View>
      </View>
    );
  }

  const d = buildReport(weeklyStats, user);

  // Prefer Claude's real, data-grounded recommendations; fall back to the local
  // algorithmic ones only if the Edge Function call failed.
  const focusItems = aiReport
    ? aiReport.recommendations.map((r) => ({ text: r.title, sub: r.detail }))
    : d.focusItems;

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

        {/* ── AI Recap — shape follows the week, not a fixed template ── */}
        <View style={[styles.card, styles.cardDark]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBubble, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <Ionicons name="sparkles" size={16} color="#F5B800" />
            </View>
            <Text style={[styles.cardLabel, styles.cardLabelLight]}>Your Week</Text>
          </View>
          {aiReport ? (
            <RecapText text={aiReport.recap} />
          ) : (
            <Text style={styles.recapText}>
              Couldn't generate your recap right now — your stats below are still accurate.
            </Text>
          )}
        </View>

        {/* ── What improved ── */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBubble, { backgroundColor: '#CCFBF1' }]}>
              <Text style={styles.emojiIcon}>💪</Text>
            </View>
            <Text style={styles.cardLabel}>What Improved</Text>
          </View>

          <View style={styles.metricsRow}>
            {[
              {
                // A flat 0% (no data either week — never a real decline) reads as "-0%" with
                // a sign, which looks like a measured drop. Show a plain, neutral "0%" instead.
                value: d.stepsChangeAbs === 0 ? '0%' : `${d.stepsUp ? '+' : '-'}${d.stepsChangeAbs}%`,
                label: 'Steps',
                color: d.stepsChangeAbs === 0 ? '#6B7280' : d.stepsUp ? '#16A34A' : '#DC2626',
              },
              { value: `${d.activeDays}/7`, label: 'Active days', color: '#1B2B4B' },
              {
                value: d.calChangeAbs === 0 ? '0%' : `${d.calUp ? '+' : '-'}${d.calChangeAbs}%`,
                label: 'Calories',
                color: d.calChangeAbs === 0 ? '#6B7280' : d.calUp ? '#16A34A' : '#DC2626',
              },
            ].map((m, i) => (
              <View key={i} style={[styles.metricCol, i === 1 && styles.metricColMid]}>
                <Text style={[styles.metricVal, { color: m.color }]}>{m.value}</Text>
                <Text style={styles.metricLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Card 4: Focus ── */}
        <View style={[styles.card, styles.cardDark]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBubble, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <Text style={styles.emojiIcon}>🎯</Text>
            </View>
            <Text style={[styles.cardLabel, styles.cardLabelLight]}>This Week's Focus</Text>
          </View>

          {focusItems.map((item, i) => (
            <View key={i} style={[styles.focusItem, i < focusItems.length - 1 && styles.focusItemBorder]}>
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

  // Recap text (freeform, shape follows content)
  recapText: { fontSize: 14, color: '#E2E8F0', lineHeight: 22, fontWeight: '400' },
  recapBold: { fontWeight: '700', color: '#FFFFFF' },
  recapBulletRow: { flexDirection: 'row', gap: 8 },
  recapBulletDot: { fontSize: 14, color: '#F5B800', lineHeight: 22 },

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
