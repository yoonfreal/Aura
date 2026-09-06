import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TYPE_PILL_GAP = 8;
const TYPE_PILL_PADDING = 4;
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUserStore } from '@/store/userStore';
import {
  createPost,
  updatePost,
  fetchPostById,
  fetchRecentAchievements,
  ACTIVITY_TYPES,
  CAMPUS_LOCATIONS,
  EXPIRY_OPTIONS,
  type AchievementCandidate,
  type PostType,
  type ExpiryOption,
} from '@/lib/posts';
import { fetchLinkableChallenges, type LinkableChallenge } from '@/lib/challenges';
import { fetchAppSettings, type AppSettings } from '@/lib/appSettings';
import { thailandDateISO } from '@/lib/thailandTime';
import { ActivityTypeIcon } from '@/components/ActivityTypeIcon';

const POST_TYPES: { type: PostType; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { type: 'partner', icon: 'people', label: 'Partner' },
  { type: 'achievement', icon: 'trophy', label: 'Achievement' },
  { type: 'thoughts', icon: 'chatbubble-ellipses', label: 'Thoughts' },
];

function formatDateTime(d: Date): string {
  const datePart = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

function formatSelectedDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// The exact expiry choice isn't stored — only the resulting timestamp — so this is a
// best-effort guess when loading a post back into the editor: exact match on activityAt
// means "after event", otherwise pick whichever fixed duration is closest.
function guessExpiryOption(expiresAt: string, activityAt: string | null): ExpiryOption {
  if (activityAt && Math.abs(new Date(expiresAt).getTime() - new Date(activityAt).getTime()) < 60_000) {
    return 'after_event';
  }
  const hoursLeft = (new Date(expiresAt).getTime() - Date.now()) / 3_600_000;
  const durations: { value: ExpiryOption; hours: number }[] = [
    { value: '24h', hours: 24 },
    { value: '48h', hours: 48 },
    { value: '1w', hours: 24 * 7 },
  ];
  return durations.reduce((best, d) => (Math.abs(d.hours - hoursLeft) < Math.abs(best.hours - hoursLeft) ? d : best))
    .value;
}

type LinkedChallengeInfo = { id: string; title: string; icon: string };

export default function CreatePostScreen() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const { editPostId } = useLocalSearchParams<{ editPostId?: string }>();
  const isEditing = !!editPostId;
  const [loadingExisting, setLoadingExisting] = useState(isEditing);

  const [type, setType] = useState<PostType | null>(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);

  const [typeTrackWidth, setTypeTrackWidth] = useState(0);
  const typePillAnim = useRef(new Animated.Value(0)).current;
  const typePillOpacity = useRef(new Animated.Value(0)).current;
  const typeIndex = type ? POST_TYPES.findIndex((pt) => pt.type === type) : -1;

  useEffect(() => {
    if (typeIndex < 0) return;
    Animated.parallel([
      Animated.timing(typePillAnim, { toValue: typeIndex, duration: 240, useNativeDriver: true }),
      Animated.timing(typePillOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [typeIndex]);

  // Fetched once so the type picker can tell the user up front which post types an admin has
  // turned off, instead of only finding out after filling in the whole form and hitting Post
  // (posts.ts still enforces this for real at submit time — this is just the earlier warning).
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    fetchAppSettings().then(setAppSettings);
  }, []);

  // communityPostsEnabled is the master switch for every type, including partner —
  // partnerFinderEnabled is only checked once that master switch is already on.
  function isTypeDisabled(t: PostType): boolean {
    if (!appSettings) return false;
    if (!appSettings.communityPostsEnabled) return true;
    return t === 'partner' && !appSettings.partnerFinderEnabled;
  }

  function handleSelectType(next: PostType) {
    if (appSettings && !appSettings.communityPostsEnabled) {
      Alert.alert('Posting is off', 'An admin has temporarily disabled posting.');
      return;
    }
    if (next === 'partner' && appSettings && !appSettings.partnerFinderEnabled) {
      Alert.alert('Partner finder is off', 'An admin has temporarily disabled partner finder posts.');
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setType(next);
  }

  // Achievement
  const [achievements, setAchievements] = useState<AchievementCandidate[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementCandidate | null>(null);

  // Partner
  const [activityType, setActivityType] = useState<string | null>(null);
  const [showActivityTypePicker, setShowActivityTypePicker] = useState(false);
  const [customActivityType, setCustomActivityType] = useState('');
  const [activityTypeQuery, setActivityTypeQuery] = useState('');
  const [activityDate, setActivityDate] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [activityTime, setActivityTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [peopleNeeded, setPeopleNeeded] = useState<number | null>(2);
  const [autoExpire, setAutoExpire] = useState(false);
  const [expiryOption, setExpiryOption] = useState<ExpiryOption | null>(null);

  // Link a challenge (any post type)
  const [linkedChallenge, setLinkedChallenge] = useState<LinkedChallengeInfo | null>(null);
  const [showChallengePicker, setShowChallengePicker] = useState(false);
  const [linkableChallenges, setLinkableChallenges] = useState<LinkableChallenge[]>([]);
  const [loadingLinkable, setLoadingLinkable] = useState(false);
  const [challengeQuery, setChallengeQuery] = useState('');

  useEffect(() => {
    if (isEditing || type !== 'achievement' || !user?.id || achievements.length > 0) return;
    setLoadingAchievements(true);
    fetchRecentAchievements(user.id)
      .then(setAchievements)
      .finally(() => setLoadingAchievements(false));
  }, [isEditing, type, user?.id]);

  useEffect(() => {
    if (!editPostId) return;
    let cancelled = false;
    fetchPostById(editPostId)
      .then((post) => {
        if (cancelled || !post) return;
        setType(post.type);
        setCaption(post.caption ?? '');

        if (post.type === 'achievement') {
          setSelectedAchievement({
            kind: 'stat',
            title: post.achievementTitle ?? '',
            icon: post.achievementIcon ?? '🏆',
            xp: post.achievementXp,
            sortKey: post.createdAt,
          });
        }

        if (post.type === 'partner') {
          if (post.activityType && !ACTIVITY_TYPES.some((a) => a.value === post.activityType)) {
            setActivityType('other');
            setCustomActivityType(post.activityType);
          } else {
            setActivityType(post.activityType);
          }
          if (post.location && !CAMPUS_LOCATIONS.includes(post.location)) {
            setLocation('Other');
            setCustomLocation(post.location);
          } else {
            setLocation(post.location);
          }
          setPeopleNeeded(post.peopleNeeded);
          if (post.activityAt) {
            const d = new Date(post.activityAt);
            setActivityDate(toDateInputValue(d));
            setActivityTime(d);
          }
          if (post.expiresAt) {
            setAutoExpire(true);
            setExpiryOption(guessExpiryOption(post.expiresAt, post.activityAt));
          }
        }

        if (post.linkedChallengeId) {
          setLinkedChallenge({
            id: post.linkedChallengeId,
            title: post.linkedChallengeTitle ?? '',
            icon: post.linkedChallengeIcon ?? '🏆',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editPostId]);

  function handleToggleAutoExpire(value: boolean) {
    setAutoExpire(value);
    if (value && !expiryOption) setExpiryOption('24h');
  }

  function handleOpenChallengePicker() {
    const next = !showChallengePicker;
    setShowChallengePicker(next);
    if (!next) setChallengeQuery('');
    if (next && linkableChallenges.length === 0) {
      setLoadingLinkable(true);
      fetchLinkableChallenges()
        .then(setLinkableChallenges)
        .catch(() => setLinkableChallenges([]))
        .finally(() => setLoadingLinkable(false));
    }
  }

  const now = new Date();
  const isSelectedDateToday = !!activityDate && activityDate === toDateInputValue(now);
  const selectedTimeIsPast =
    isSelectedDateToday &&
    !!activityTime &&
    (() => {
      const selected = new Date(now);
      selected.setHours(activityTime.getHours(), activityTime.getMinutes(), 0, 0);
      return selected <= now;
    })();

  const activityAt =
    activityDate && activityTime && !selectedTimeIsPast
      ? (() => {
          const [year, month, day] = activityDate.split('-').map(Number);
          return new Date(year, month - 1, day, activityTime.getHours(), activityTime.getMinutes(), 0, 0);
        })()
      : null;
  const selectedActivityType = ACTIVITY_TYPES.find((a) => a.value === activityType);
  const filteredActivityTypes = ACTIVITY_TYPES.filter((a) =>
    a.label.toLowerCase().includes(activityTypeQuery.trim().toLowerCase())
  );
  const filteredLocations = CAMPUS_LOCATIONS.filter((loc) =>
    loc.toLowerCase().includes(locationQuery.trim().toLowerCase())
  );
  const effectiveActivityType = activityType === 'other' ? customActivityType.trim() : activityType;
  const effectiveLocation = location === 'Other' ? customLocation.trim() : location;
  const filteredChallenges = linkableChallenges.filter((c) =>
    c.title.toLowerCase().includes(challengeQuery.trim().toLowerCase())
  );

  const partnerValid = type === 'partner' && !!effectiveActivityType && !!activityAt && !!effectiveLocation;
  const canPost =
    !posting &&
    ((type === 'thoughts' && caption.trim().length > 0) || (type === 'achievement' && !!selectedAchievement) || partnerValid);

  async function handlePost() {
    if (!user?.id || !type || !canPost) return;
    setPosting(true);
    try {
      const partner =
        type === 'partner' && effectiveActivityType && activityAt && effectiveLocation
          ? { activityType: effectiveActivityType, activityAt: activityAt.toISOString(), location: effectiveLocation, peopleNeeded }
          : undefined;
      if (isEditing && editPostId) {
        await updatePost(user.id, editPostId, {
          caption: caption.trim(),
          partner,
          expiryOption: type === 'partner' && autoExpire ? expiryOption : null,
          challengeId: linkedChallenge?.id ?? null,
        });
      } else {
        await createPost(user.id, {
          type,
          caption: caption.trim(),
          achievement: type === 'achievement' ? (selectedAchievement ?? undefined) : undefined,
          partner,
          expiryOption: type === 'partner' && autoExpire ? expiryOption : null,
          challengeId: linkedChallenge?.id ?? null,
        });
      }
      router.back();
    } catch (err) {
      setPosting(false);
      Alert.alert(
        isEditing ? 'Could not save changes' : 'Could not post',
        (err as { message?: string })?.message ?? 'Please try again.'
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#0D1829" />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Edit post' : 'Create post'}</Text>
        <TouchableOpacity
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
          disabled={!canPost}
          onPress={handlePost}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.postBtnText, !canPost && styles.postBtnTextDisabled]}>
              {isEditing ? 'Save' : 'Post'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {loadingExisting ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1B2B4B" />
      ) : (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>POST TYPE</Text>
        <View
          style={[styles.typeRow, isEditing && styles.typeRowDisabled]}
          pointerEvents={isEditing ? 'none' : 'auto'}
          onLayout={(e) => setTypeTrackWidth(e.nativeEvent.layout.width)}
        >
          {typeTrackWidth > 0 && (() => {
            const itemWidth =
              (typeTrackWidth - TYPE_PILL_PADDING * 2 - TYPE_PILL_GAP * (POST_TYPES.length - 1)) / POST_TYPES.length;
            return (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.typePill,
                  {
                    width: itemWidth,
                    opacity: typePillOpacity,
                    transform: [
                      {
                        translateX: typePillAnim.interpolate({
                          inputRange: [0, POST_TYPES.length - 1],
                          outputRange: [0, (itemWidth + TYPE_PILL_GAP) * (POST_TYPES.length - 1)],
                        }),
                      },
                    ],
                  },
                ]}
              />
            );
          })()}
          {POST_TYPES.map((pt) => {
            const active = type === pt.type;
            const disabled = isTypeDisabled(pt.type);
            return (
              <TouchableOpacity
                key={pt.type}
                style={styles.typeCard}
                onPress={() => handleSelectType(pt.type)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={active ? pt.icon : (`${pt.icon}-outline` as keyof typeof Ionicons.glyphMap)}
                  size={18}
                  color={disabled ? '#C7CED9' : active ? '#F5B800' : '#8A9BB0'}
                />
                <Text style={[styles.typeLabel, active && styles.typeLabelActive, disabled && styles.typeLabelDisabled]}>
                  {pt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={styles.captionInput}
          placeholder="Write a caption..."
          placeholderTextColor="#9CA3AF"
          multiline
          value={caption}
          onChangeText={setCaption}
        />

        {type === 'achievement' && isEditing && selectedAchievement && (
          <View style={[styles.section, styles.sectionWhite]}>
            <Text style={styles.sectionLabel}>ACHIEVEMENT</Text>
            <Text style={styles.emptyText}>Which achievement was shared can't be changed after posting.</Text>
            <View style={[styles.achievementRow, { marginTop: 10 }]}>
              <Text style={styles.achievementIcon}>{selectedAchievement.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.achievementTitle}>{selectedAchievement.title}</Text>
                {selectedAchievement.xp != null && (
                  <Text style={styles.achievementXp}>+{selectedAchievement.xp} XP</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {type === 'achievement' && !isEditing && (
          <View style={[styles.section, styles.sectionWhite]}>
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
                    {a.iconKind === 'ionicon' ? (
                      <View style={styles.achievementIconWrap}>
                        <Ionicons
                          name={a.icon as keyof typeof Ionicons.glyphMap}
                          size={20}
                          color={a.iconColor ?? '#1B2B4B'}
                        />
                      </View>
                    ) : (
                      <Text style={styles.achievementIcon}>{a.icon}</Text>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.achievementTitle}>{a.title}</Text>
                      {a.xp != null && <Text style={styles.achievementXp}>+{a.xp} XP</Text>}
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
            <View style={[styles.section, styles.sectionWhite]}>
              <Text style={styles.sectionLabel}>ACTIVITY DETAILS</Text>

              <Text style={styles.fieldLabel}>Activity type</Text>
              {activityType === 'other' ? (
                <View style={styles.dropdownField}>
                  <TextInput
                    style={styles.customFieldInput}
                    placeholder="Enter the specific activity"
                    placeholderTextColor="#9CA3AF"
                    value={customActivityType}
                    onChangeText={setCustomActivityType}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setShowActivityTypePicker((v) => !v);
                    }}
                  >
                    <Ionicons name={showActivityTypePicker ? 'chevron-up' : 'chevron-down'} size={18} color="#8A9BB0" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.dropdownField}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowActivityTypePicker((v) => {
                      if (v) setActivityTypeQuery('');
                      return !v;
                    });
                  }}
                >
                  {selectedActivityType ? (
                    <View style={styles.dropdownFieldValue}>
                      <ActivityTypeIcon activityType={selectedActivityType} size={16} color="#1B2B4B" />
                      <Text style={styles.dropdownFieldText}>{selectedActivityType.label}</Text>
                    </View>
                  ) : (
                    <Text style={styles.dropdownFieldPlaceholder}>Select an activity</Text>
                  )}
                  <Ionicons name={showActivityTypePicker ? 'chevron-up' : 'chevron-down'} size={18} color="#8A9BB0" />
                </TouchableOpacity>
              )}
              {showActivityTypePicker && (
                <View style={styles.dropdownOptions}>
                  <View style={styles.dropdownSearchRow}>
                    <Ionicons name="search" size={16} color="#8A9BB0" />
                    <TextInput
                      style={styles.dropdownSearchInput}
                      placeholder="Search activity..."
                      placeholderTextColor="#9CA3AF"
                      value={activityTypeQuery}
                      onChangeText={setActivityTypeQuery}
                      autoFocus
                    />
                    {activityTypeQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setActivityTypeQuery('')}>
                        <Ionicons name="close-circle" size={16} color="#C0C8D4" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {filteredActivityTypes.length === 0 ? (
                    <Text style={styles.dropdownEmptyText}>No matching activities</Text>
                  ) : (
                    filteredActivityTypes.map((a, i) => (
                      <TouchableOpacity
                        key={a.value}
                        style={[
                          styles.dropdownOptionRow,
                          i === filteredActivityTypes.length - 1 && styles.dropdownOptionRowLast,
                        ]}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setActivityType(a.value);
                          setShowActivityTypePicker(false);
                          setActivityTypeQuery('');
                        }}
                      >
                        <ActivityTypeIcon activityType={a} size={16} color="#8A9BB0" />
                        <Text style={styles.dropdownOptionText}>{a.label}</Text>
                        {activityType === a.value && (
                          <Ionicons name="checkmark" size={18} color="#1B2B4B" />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              <Text style={styles.fieldLabel}>Date & time</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[styles.dropdownField, { flex: 1 }]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowCalendar((v) => !v);
                  }}
                >
                  <View style={styles.dropdownFieldValue}>
                    <Ionicons name="calendar-outline" size={16} color={activityDate ? '#1B2B4B' : '#8A9BB0'} />
                    <Text style={activityDate ? styles.dropdownFieldText : styles.dropdownFieldPlaceholder}>
                      {activityDate ? formatSelectedDate(activityDate) : 'Select date'}
                    </Text>
                  </View>
                  <Ionicons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={16} color="#8A9BB0" />
                </TouchableOpacity>

                  <TouchableOpacity
                  style={styles.dateTimeField}
                  onPress={() => {
                    if (!activityDate) {
                      Alert.alert('Select a date first', 'Please select a date before choosing a time.');
                      return;
                    }
                    setShowTimePicker(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={16} color={activityTime ? '#1B2B4B' : '#8A9BB0'} />
                  <Text style={activityTime ? styles.dateTimeInputText : styles.dateTimePlaceholder}>
                    {activityTime
                      ? activityTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                      : 'Select time'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showTimePicker && activityDate && (
                <View style={styles.timePickerWrap}>
                  <DateTimePicker
                    value={activityTime ?? new Date()}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    is24Hour={false}
                    style={Platform.OS === 'ios' ? styles.timePickerSpinner : undefined}
                    onValueChange={(_event, selected) => {
                      setActivityTime(selected);
                      if (Platform.OS !== 'ios') {
                        setShowTimePicker(false);
                      }
                    }}
                    onDismiss={() => {
                      if (Platform.OS !== 'ios') {
                        setShowTimePicker(false);
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.timePickerDone}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={styles.timePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}

              {showCalendar && (
                <View style={styles.calendarWrap}>
                  <Calendar
                    minDate={thailandDateISO()}
                    current={activityDate ?? undefined}
                    markedDates={activityDate ? { [activityDate]: { selected: true, selectedColor: '#1B2B4B' } } : {}}
                    onDayPress={(day) => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setActivityDate(day.dateString);
                      setShowCalendar(false);
                    }}
                    theme={{
                      todayTextColor: '#1B2B4B',
                      arrowColor: '#1B2B4B',
                      selectedDayBackgroundColor: '#1B2B4B',
                      textDayFontWeight: '600',
                      textMonthFontWeight: '800',
                    }}
                  />
                </View>
              )}

              {activityAt ? (
                <Text style={styles.dateSummary}>{formatDateTime(activityAt)}</Text>
              ) : selectedTimeIsPast ? (
                <Text style={styles.dateError}>Please select a time later than the current time.</Text>
              ) : null}

              <Text style={styles.fieldLabel}>Location on campus</Text>
              {location === 'Other' ? (
                <View style={styles.dropdownField}>
                  <TextInput
                    style={styles.customFieldInput}
                    placeholder="Enter the specific location"
                    placeholderTextColor="#9CA3AF"
                    value={customLocation}
                    onChangeText={setCustomLocation}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setShowLocationPicker((v) => !v);
                    }}
                  >
                    <Ionicons name={showLocationPicker ? 'chevron-up' : 'chevron-down'} size={18} color="#8A9BB0" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.dropdownField}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowLocationPicker((v) => {
                      if (v) setLocationQuery('');
                      return !v;
                    });
                  }}
                >
                  {location ? (
                    <Text style={styles.dropdownFieldText}>{location}</Text>
                  ) : (
                    <Text style={styles.dropdownFieldPlaceholder}>Select a location</Text>
                  )}
                  <Ionicons name={showLocationPicker ? 'chevron-up' : 'chevron-down'} size={18} color="#8A9BB0" />
                </TouchableOpacity>
              )}
              {showLocationPicker && (
                <View style={styles.dropdownOptions}>
                  <View style={styles.dropdownSearchRow}>
                    <Ionicons name="search" size={16} color="#8A9BB0" />
                    <TextInput
                      style={styles.dropdownSearchInput}
                      placeholder="Search location..."
                      placeholderTextColor="#9CA3AF"
                      value={locationQuery}
                      onChangeText={setLocationQuery}
                      autoFocus
                    />
                    {locationQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setLocationQuery('')}>
                        <Ionicons name="close-circle" size={16} color="#C0C8D4" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {filteredLocations.length === 0 ? (
                    <Text style={styles.dropdownEmptyText}>No matching locations</Text>
                  ) : (
                    filteredLocations.map((loc, i) => (
                      <TouchableOpacity
                        key={loc}
                        style={[
                          styles.dropdownOptionRow,
                          i === filteredLocations.length - 1 && styles.dropdownOptionRowLast,
                        ]}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setLocation(loc);
                          setShowLocationPicker(false);
                          setLocationQuery('');
                        }}
                      >
                        <Text style={styles.dropdownOptionText}>{loc}</Text>
                        {location === loc && <Ionicons name="checkmark" size={18} color="#1B2B4B" />}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              <View style={styles.peopleSection}>
                <View style={styles.peopleTopRow}>
                  <Text style={styles.peopleLabel}>People needed</Text>

                  <View style={styles.peopleOptionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.peopleOptionSmall,
                        peopleNeeded === null && styles.peopleOptionActive,
                      ]}
                      onPress={() => setPeopleNeeded(null)}
                    >
                      <Text
                        style={[
                          styles.peopleOptionText,
                          peopleNeeded === null && styles.peopleOptionTextActive,
                        ]}
                      >
                        Any
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.peopleOptionSmall,
                        peopleNeeded !== null && styles.peopleOptionActive,
                      ]}
                      onPress={() =>
                        setPeopleNeeded((current) =>
                          current === null ? 2 : current
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.peopleOptionText,
                          peopleNeeded !== null && styles.peopleOptionTextActive,
                        ]}
                      >
                        Set number
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {peopleNeeded !== null && (
                  <View style={styles.numberAdjustRow}>
                    <TouchableOpacity
                      style={styles.peopleStepperBtn}
                      onPress={() =>
                        setPeopleNeeded((current) =>
                          Math.max(1, (current ?? 1) - 1)
                        )
                      }
                    >
                      <Ionicons name="remove" size={16} color="#0D1829" />
                    </TouchableOpacity>

                    <View style={styles.numberValueBox}>
                      <Text style={styles.numberValueText}>
                        {peopleNeeded}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.peopleStepperBtn}
                      onPress={() =>
                        setPeopleNeeded((current) =>
                          Math.min(20, (current ?? 1) + 1)
                        )
                      }
                    >
                      <Ionicons name="add" size={16} color="#0D1829" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <View style={[styles.section, styles.sectionWhite]}>
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

        <View style={[styles.section, styles.sectionWhite]}>
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
            <View style={styles.dropdownOptions}>
              {!loadingLinkable && linkableChallenges.length > 0 && (
                <View style={styles.dropdownSearchRow}>
                  <Ionicons name="search" size={16} color="#8A9BB0" />
                  <TextInput
                    style={styles.dropdownSearchInput}
                    placeholder="Search challenges..."
                    placeholderTextColor="#9CA3AF"
                    value={challengeQuery}
                    onChangeText={setChallengeQuery}
                    autoFocus
                  />
                  {challengeQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setChallengeQuery('')}>
                      <Ionicons name="close-circle" size={16} color="#C0C8D4" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {loadingLinkable ? (
                <ActivityIndicator color="#1B2B4B" style={{ paddingVertical: 14 }} />
              ) : linkableChallenges.length === 0 ? (
                <Text style={styles.dropdownEmptyText}>No open challenges right now.</Text>
              ) : filteredChallenges.length === 0 ? (
                <Text style={styles.dropdownEmptyText}>No matching challenges</Text>
              ) : (
                filteredChallenges.map((c, i) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.linkOptionRow,
                      i === filteredChallenges.length - 1 && styles.linkOptionRowLast,
                    ]}
                    onPress={() => {
                      setLinkedChallenge(c);
                      setShowChallengePicker(false);
                      setChallengeQuery('');
                    }}
                  >
                    <Text style={styles.linkOptionIcon}>{c.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.linkOptionTitle}>{c.title}</Text>
                      {c.description && (
                        <Text style={styles.linkOptionDescription} numberOfLines={2}>
                          {c.description}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
      )}
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
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2B4B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  section: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: '#E9EDF3',
    borderRadius: 16,
    padding: 14,
  },
  sectionWhite: { backgroundColor: '#fff' },

  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
    backgroundColor: '#fff',
    padding: 4,
    borderRadius: 16,
  },
  typeRowDisabled: { opacity: 0.6 },
  typeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    zIndex: 1,
  },
  typePill: {
    position: 'absolute',
    top: TYPE_PILL_PADDING,
    bottom: TYPE_PILL_PADDING,
    left: TYPE_PILL_PADDING,
    borderRadius: 12,
    backgroundColor: '#1B2B4B',
    shadowColor: '#1B2B4B',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  typeLabel: { fontSize: 13, fontWeight: '700', color: '#8A9BB0' },
  typeLabelActive: { color: '#fff' },
  typeLabelDisabled: { color: '#C7CED9' },

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
  achievementIconWrap: { width: 28, alignItems: 'center', justifyContent: 'center' },
  achievementTitle: { fontSize: 13, fontWeight: '700', color: '#0D1829' },
  achievementXp: { fontSize: 12, color: '#8A6D00', fontWeight: '700', marginTop: 2 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#8A9BB0', marginTop: 14, marginBottom: 8 },

  dateTimeRow: { flexDirection: 'row', gap: 8 },
  dateTimeField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateTimeInput: { flex: 1, fontSize: 14, color: '#0D1829', fontWeight: '600', padding: 0 },
  dateTimeInputText: { flex: 1, fontSize: 14, color: '#0D1829', fontWeight: '600' },
  dateTimePlaceholder: { flex: 1, fontSize: 14, color: '#9CA3AF' },
  timePickerWrap: { marginTop: 8, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  timePickerSpinner: { height: 180 },
  timePickerDone: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 8 },
  timePickerDoneText: { fontSize: 13, fontWeight: '700', color: '#1B2B4B' },
  dateSummary: { fontSize: 12, color: '#1B2B4B', fontWeight: '700', marginTop: 8 },
  dateError: { fontSize: 12, color: '#DC2626', marginTop: 8, lineHeight: 17 },
  calendarWrap: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    padding: 8,
    overflow: 'hidden',
  },

  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownFieldValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dropdownFieldText: { fontSize: 14, fontWeight: '600', color: '#0D1829' },
  dropdownFieldPlaceholder: { fontSize: 14, color: '#9CA3AF' },
  dropdownOptions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    paddingHorizontal: 14,
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  dropdownOptionRowLast: { borderBottomWidth: 0 },
  dropdownOptionText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0D1829' },
  dropdownSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  dropdownSearchInput: { flex: 1, fontSize: 14, color: '#0D1829', padding: 0 },
  dropdownEmptyText: { fontSize: 13, color: '#9CA3AF', paddingVertical: 14, textAlign: 'center' },
  customFieldInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1829',
    padding: 0,
  },

  peopleSection: {
    marginTop: 14,
  },

  peopleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  peopleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A9BB0',
  },

  peopleOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },

  peopleOptionSmall: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  peopleOptionActive: {
    backgroundColor: '#1B2B4B',
    borderColor: '#1B2B4B',
  },

  peopleOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D1829',
  },

  peopleOptionTextActive: {
    color: '#fff',
  },

  numberAdjustRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },

  peopleStepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  numberValueBox: {
    width: 42,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  numberValueText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D1829',
  },

  expiryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  expiryToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  expiryTitle: { fontSize: 14, fontWeight: '700', color: '#0D1829' },
  expirySubtitle: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
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
  linkSubtitle: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
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
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  linkOptionRowLast: { marginBottom: 0 },
  linkOptionIcon: { fontSize: 18 },
  linkOptionTitle: { fontSize: 13, fontWeight: '700', color: '#0D1829' },
  linkOptionDescription: { fontSize: 12, color: '#8A9BB0', marginTop: 2, lineHeight: 16 },
});
