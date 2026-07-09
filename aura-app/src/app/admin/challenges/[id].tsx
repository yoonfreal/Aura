import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchChallengeById, updateChallenge, deleteChallenge } from '@/lib/challenges';
import type { Challenge, ChallengeType } from '@/types';

const TYPE_OPTIONS: { value: ChallengeType; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: '1v1', label: '1v1' },
  { value: 'team', label: 'Team' },
];

const DURATION_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'No limit' },
  { value: 1, label: 'Daily' },
  { value: 7, label: 'Weekly' },
  { value: 30, label: 'Monthly' },
];

// "No limit" still needs a real end date under the hood (the column isn't nullable), so
// it just uses a date far enough out that it never realistically comes up.
const NO_LIMIT_DAYS = 36500;

function addDaysISO(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function EditChallengeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🏆');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<ChallengeType>('individual');
  const [goalValue, setGoalValue] = useState('');
  const [goalUnit, setGoalUnit] = useState('STEPS');
  const [xpReward, setXpReward] = useState('');
  const [durationDays, setDurationDays] = useState<number | null>(7);
  const [badgeName, setBadgeName] = useState('');
  const [badgeIcon, setBadgeIcon] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchChallengeById(id)
      .then((data) => {
        setChallenge(data);
        setTitle(data.title);
        setDescription(data.description ?? '');
        setIcon(data.icon);
        setCategory(data.category ?? '');
        setType(data.type);
        setGoalValue(String(data.goalValue));
        setGoalUnit(data.goalUnit);
        setXpReward(String(data.xpReward));
        setDurationDays(data.durationDays);
        setBadgeName(data.badgeName ?? '');
        setBadgeIcon(data.badgeIcon ?? '');
      })
      .catch(() => Alert.alert('Error', 'Could not load this challenge.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!challenge) return;

    const goalValueNum = Number(goalValue);
    const xpRewardNum = Number(xpReward);

    if (!title.trim() || !goalValue || !xpReward) {
      Alert.alert('Missing fields', 'Title, goal, and XP are required.');
      return;
    }
    if (Number.isNaN(goalValueNum) || Number.isNaN(xpRewardNum)) {
      Alert.alert('Invalid number', 'Goal value and XP reward must be numbers.');
      return;
    }

    setSaving(true);
    try {
      await updateChallenge(challenge.id, {
        title: title.trim(),
        description: description.trim() || null,
        icon: icon.trim() || '🏆',
        category: category.trim() || null,
        type,
        goalValue: goalValueNum,
        goalUnit: goalUnit.trim(),
        xpReward: xpRewardNum,
        startDate: challenge.startDate,
        // Recomputed off the challenge's original start date, not today — editing an
        // existing challenge shouldn't shift when it began.
        endDate: addDaysISO(challenge.startDate, durationDays === null ? NO_LIMIT_DAYS : durationDays - 1),
        durationDays: type === 'team' ? durationDays : null,
        badgeName: badgeName.trim() || null,
        badgeIcon: badgeIcon.trim() || null,
      });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save the challenge. Try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!challenge) return;
    Alert.alert(
      'Delete challenge?',
      `"${challenge.title}" will be removed for everyone who joined it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteChallenge(challenge.id);
            router.back();
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#0D1829" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Challenge</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="10K Steps Challenge" />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Reach 10,000 steps every day this week"
          multiline
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.typeChip, type === opt.value && styles.typeChipActive]}
              onPress={() => setType(opt.value)}
            >
              <Text style={[styles.typeChipText, type === opt.value && styles.typeChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>
          {type === 'team'
            ? 'Duration (shared by the whole team, from when it is created)'
            : type === '1v1'
              ? 'Duration (how long this is open to start a race in)'
              : 'Duration (how long this challenge runs for everyone)'}
        </Text>
        <View style={styles.typeRow}>
          {DURATION_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={[styles.typeChip, durationDays === opt.value && styles.typeChipActive]}
              onPress={() => setDurationDays(opt.value)}
            >
              <Text style={[styles.typeChipText, durationDays === opt.value && styles.typeChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Category (optional, e.g. Sport)</Text>
        <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Sport" />

        <Text style={styles.label}>Icon (emoji)</Text>
        <TextInput style={styles.input} value={icon} onChangeText={setIcon} placeholder="🏆" />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Goal value</Text>
            <TextInput
              style={styles.input}
              value={goalValue}
              onChangeText={setGoalValue}
              placeholder="10000"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Goal unit</Text>
            <TextInput
              style={styles.input}
              value={goalUnit}
              onChangeText={(text) => setGoalUnit(text.toUpperCase())}
              autoCapitalize="characters"
              placeholder="STEPS"
            />
          </View>
        </View>

        <Text style={styles.label}>XP reward</Text>
        <TextInput
          style={styles.input}
          value={xpReward}
          onChangeText={setXpReward}
          placeholder="500"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Badge name (optional)</Text>
        <TextInput
          style={styles.input}
          value={badgeName}
          onChangeText={setBadgeName}
          placeholder="10K Walker"
        />

        <Text style={styles.label}>Badge icon (emoji, optional)</Text>
        <TextInput style={styles.input} value={badgeIcon} onChangeText={setBadgeIcon} placeholder="🥾" />

        <TouchableOpacity
          style={[styles.createBtn, saving && styles.createBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.createBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F6F9' },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0D1829' },
  form: { paddingHorizontal: 20, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0D1829',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  typeChipActive: { backgroundColor: '#1B2B4B', borderColor: '#1B2B4B' },
  typeChipText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  typeChipTextActive: { color: '#fff' },
  createBtn: {
    backgroundColor: '#F5B800',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { fontSize: 15, fontWeight: '800', color: '#1B2B4B' },
});
