import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUserStore } from '@/store/userStore';
import { getLevelTitle } from '@/lib/level';
import {
  createPost,
  fetchRecentAchievements,
  ACTIVITY_TYPES,
  CAMPUS_LOCATIONS,
  EXPIRY_OPTIONS,
  type AchievementCandidate,
  type PostType,
  type ExpiryOption,
} from '@/lib/posts';
import { fetchLinkableChallenges, type LinkableChallenge } from '@/lib/challenges';

const POST_TYPES: { type: PostType; icon: string; label: string }[] = [
  { type: 'partner', icon: '🤝', label: 'Partner' },
  { type: 'achievement', icon: '🏆', label: 'Achievement' },
  { type: 'thoughts', icon: '💭', label: 'Thoughts' },
];

function formatDateTime(d: Date): string {
  const datePart = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

export default function CreatePostScreen() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);

  const [type, setType] = useState<PostType | null>(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);

  // Achievement
  const [achievements, setAchievements] = useState<AchievementCandidate[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementCandidate | null>(null);

  // Partner
  const [activityType, setActivityType] = useState<string | null>(null);
  const [activityAt, setActivityAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [peopleNeeded, setPeopleNeeded] = useState(2);
  const [autoExpire, setAutoExpire] = useState(false);
  const [expiryOption, setExpiryOption] = useState<ExpiryOption | null>(null);

  // Link a challenge (any post type)
  const [linkedChallenge, setLinkedChallenge] = useState<LinkableChallenge | null>(null);
  const [showChallengePicker, setShowChallengePicker] = useState(false);
  const [linkableChallenges, setLinkableChallenges] = useState<LinkableChallenge[]>([]);
  const [loadingLinkable, setLoadingLinkable] = useState(false);

  useEffect(() => {
    if (type !== 'achievement' || !user?.id || achievements.length > 0) return;
    setLoadingAchievements(true);
    fetchRecentAchievements(user.id)
      .then(setAchievements)
      .finally(() => setLoadingAchievements(false));
  }, [type, user?.id]);

  function handleToggleAutoExpire(value: boolean) {
    setAutoExpire(value);
    if (value && !expiryOption) setExpiryOption('24h');
  }

  function handleOpenChallengePicker() {
    const next = !showChallengePicker;
    setShowChallengePicker(next);
    if (next && linkableChallenges.length === 0) {
      setLoadingLinkable(true);
      fetchLinkableChallenges()
        .then(setLinkableChallenges)
        .catch(() => setLinkableChallenges([]))
        .finally(() => setLoadingLinkable(false));
    }
  }

  const partnerValid = type === 'partner' && !!activityType && !!activityAt && !!location;
  const canPost =
    !posting &&
    ((type === 'thoughts' && caption.trim().length > 0) || (type === 'achievement' && !!selectedAchievement) || partnerValid);

  async function handlePost() {
    if (!user?.id || !type || !canPost) return;
    setPosting(true);
    try {
      await createPost(user.id, {
        type,
        caption: caption.trim(),
        achievement: type === 'achievement' ? (selectedAchievement ?? undefined) : undefined,
        partner:
          type === 'partner' && activityType && activityAt && location
            ? { activityType, activityAt: activityAt.toISOString(), location, peopleNeeded }
            : undefined,
        expiryOption: type === 'partner' && autoExpire ? expiryOption : null,
        challengeId: linkedChallenge?.id ?? null,
      });
      router.back();
    } catch {
      setPosting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#0D1829" />
        </TouchableOpacity>
        <Text style={styles.title}>Create post</Text>
        <TouchableOpacity
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
          disabled={!canPost}
          onPress={handlePost}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.postBtnText, !canPost && styles.postBtnTextDisabled]}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>POST TYPE</Text>
        <View style={styles.typeRow}>
          {POST_TYPES.map((pt) => (
            <TouchableOpacity
              key={pt.type}
              style={[styles.typeCard, type === pt.type && styles.typeCardActive]}
              onPress={() => setType(pt.type)}
            >
              <Text style={styles.typeEmoji}>{pt.icon}</Text>
              <Text style={styles.typeLabel}>{pt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {user && (
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.username.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{user.username}</Text>
              <Text style={styles.userLevel}>
                Level {user.level} · {getLevelTitle(user.level)}
              </Text>
            </View>
          </View>
        )}

        <TextInput
          style={styles.captionInput}
          placeholder="Write a caption..."
          placeholderTextColor="#9CA3AF"
          multiline
          value={caption}
          onChangeText={setCaption}
        />

        {type === 'achievement' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>YOUR RECENT ACHIEVEMENTS</Text>
            {loadingAchievements ? (
              <ActivityIndicator color="#1B2B4B" style={{ marginTop: 12 }} />
            ) : achievements.length === 0 ? (
              <Text style={styles.emptyText}>
                No achievements in the last 3 days yet — complete a mission or win a challenge to share one.
              </Text>
            ) : (
              achievements.map((a, i) => {
                const selected = selectedAchievement === a;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.achievementRow, selected && styles.achievementRowActive]}
                    onPress={() => setSelectedAchievement(a)}
                  >
                    <Text style={styles.achievementIcon}>{a.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.achievementTitle}>{a.title}</Text>
                      <Text style={styles.achievementXp}>+{a.xp} XP</Text>
                    </View>
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={selected ? '#1B2B4B' : '#C0C8D4'}
                    />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {type === 'partner' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ACTIVITY DETAILS</Text>

              <Text style={styles.fieldLabel}>Activity type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {ACTIVITY_TYPES.map((a) => (
                  <TouchableOpacity
                    key={a.value}
                    style={[styles.chip, activityType === a.value && styles.chipActive]}
                    onPress={() => setActivityType(a.value)}
                  >
                    <Text style={styles.chipEmoji}>{a.icon}</Text>
                    <Text style={[styles.chipText, activityType === a.value && styles.chipTextActive]}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Date & time</Text>
              <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color="#1B2B4B" />
                <Text style={styles.dateText}>{activityAt ? formatDateTime(activityAt) : 'Select date & time'}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={activityAt ?? new Date()}
                  mode="datetime"
                  minimumDate={new Date()}
                  onChange={(_, date) => {
                    setShowDatePicker(false);
                    if (date) setActivityAt(date);
                  }}
                />
              )}

              <Text style={styles.fieldLabel}>Location on campus</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {CAMPUS_LOCATIONS.map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.chip, location === loc && styles.chipActive]}
                    onPress={() => setLocation(loc)}
                  >
                    <Text style={[styles.chipText, location === loc && styles.chipTextActive]}>{loc}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.peopleRow}>
                <Text style={styles.fieldLabel}>People needed</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setPeopleNeeded((n) => Math.max(1, n - 1))}
                  >
                    <Ionicons name="remove" size={16} color="#0D1829" />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{peopleNeeded}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setPeopleNeeded((n) => Math.min(20, n + 1))}
                  >
                    <Ionicons name="add" size={16} color="#0D1829" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>POST EXPIRY</Text>
              <View style={styles.expiryCard}>
                <View style={styles.expiryToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expiryTitle}>Auto-expire this post</Text>
                    <Text style={styles.expirySubtitle}>Post disappears after the activity time passes</Text>
                  </View>
                  <Switch
                    value={autoExpire}
                    onValueChange={handleToggleAutoExpire}
                    trackColor={{ false: '#E2E8F0', true: '#93B4E0' }}
                    thumbColor={autoExpire ? '#1B2B4B' : '#fff'}
                  />
                </View>
                {autoExpire && (
                  <View style={styles.expiryOptionsRow}>
                    {EXPIRY_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.expiryPill, expiryOption === opt.value && styles.expiryPillActive]}
                        onPress={() => setExpiryOption(opt.value)}
                      >
                        <Text
                          style={[styles.expiryPillText, expiryOption === opt.value && styles.expiryPillTextActive]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LINK A CHALLENGE (OPTIONAL)</Text>
          {linkedChallenge ? (
            <View style={styles.linkedChallengeRow}>
              <Text style={styles.linkedChallengeIcon}>{linkedChallenge.icon}</Text>
              <Text style={styles.linkedChallengeTitle}>{linkedChallenge.title}</Text>
              <TouchableOpacity onPress={() => setLinkedChallenge(null)}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.linkRow} onPress={handleOpenChallengePicker}>
              <View style={styles.linkIconWrap}>
                <Ionicons name="flash-outline" size={18} color="#1B2B4B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>Link to a challenge</Text>
                <Text style={styles.linkSubtitle}>Invite partners to join your challenge too</Text>
              </View>
              <Ionicons name={showChallengePicker ? 'chevron-up' : 'chevron-forward'} size={18} color="#C0C8D4" />
            </TouchableOpacity>
          )}

          {showChallengePicker && !linkedChallenge && (
            loadingLinkable ? (
              <ActivityIndicator color="#1B2B4B" style={{ marginTop: 12 }} />
            ) : linkableChallenges.length === 0 ? (
              <Text style={styles.emptyText}>No open challenges right now.</Text>
            ) : (
              linkableChallenges.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.linkOptionRow}
                  onPress={() => {
                    setLinkedChallenge(c);
                    setShowChallengePicker(false);
                  }}
                >
                  <Text style={styles.linkOptionIcon}>{c.icon}</Text>
                  <Text style={styles.linkOptionTitle}>{c.title}</Text>
                </TouchableOpacity>
              ))
            )
          )}
        </View>
      </ScrollView>
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
  postBtn: { backgroundColor: '#1B2B4B', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, minWidth: 56, alignItems: 'center' },
  postBtnDisabled: { backgroundColor: '#E2E8F0' },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  postBtnTextDisabled: { color: '#9CA3AF' },

  content: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  section: { marginTop: 20 },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeCardActive: { backgroundColor: '#EBF2FF', borderColor: '#93B4E0' },
  typeEmoji: { fontSize: 26 },
  typeLabel: { fontSize: 13, fontWeight: '700', color: '#0D1829', marginTop: 6 },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4A5568', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  userName: { fontSize: 15, fontWeight: '800', color: '#0D1829' },
  userLevel: { fontSize: 12, color: '#8A9BB0', marginTop: 1 },

  captionInput: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    minHeight: 100,
    fontSize: 14,
    color: '#0D1829',
    textAlignVertical: 'top',
  },

  emptyText: { color: '#9CA3AF', fontSize: 13, lineHeight: 19 },

  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  achievementRowActive: { backgroundColor: '#EBF2FF', borderColor: '#93B4E0' },
  achievementIcon: { fontSize: 22 },
  achievementTitle: { fontSize: 13, fontWeight: '700', color: '#0D1829' },
  achievementXp: { fontSize: 12, color: '#8A6D00', fontWeight: '700', marginTop: 2 },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#0D1829', marginTop: 14, marginBottom: 8 },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: '#EBF2FF', borderColor: '#93B4E0' },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13, fontWeight: '700', color: '#0D1829' },
  chipTextActive: { color: '#1B2B4B' },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateText: { fontSize: 14, color: '#0D1829', fontWeight: '600' },

  peopleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontSize: 15, fontWeight: '800', color: '#0D1829', minWidth: 18, textAlign: 'center' },

  expiryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  expiryToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  expiryTitle: { fontSize: 14, fontWeight: '700', color: '#0D1829' },
  expirySubtitle: { fontSize: 12, color: '#8A9BB0', marginTop: 2 },
  expiryOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  expiryPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F4F8',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expiryPillActive: { backgroundColor: '#1B2B4B', borderColor: '#1B2B4B' },
  expiryPillText: { fontSize: 12, fontWeight: '700', color: '#0D1829' },
  expiryPillTextActive: { color: '#fff' },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  linkIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EBF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: { fontSize: 14, fontWeight: '700', color: '#0D1829' },
  linkSubtitle: { fontSize: 12, color: '#8A9BB0', marginTop: 2 },
  linkedChallengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EBF2FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#93B4E0',
    padding: 14,
  },
  linkedChallengeIcon: { fontSize: 18 },
  linkedChallengeTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0D1829' },
  linkOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  linkOptionIcon: { fontSize: 18 },
  linkOptionTitle: { fontSize: 13, fontWeight: '700', color: '#0D1829' },
});
