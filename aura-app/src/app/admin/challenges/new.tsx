import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '@/store/userStore';
import { createChallenge } from '@/lib/challenges';
import type { ChallengeType } from '@/types';

const TYPE_OPTIONS: { value: ChallengeType; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: '1v1', label: '1v1' },
  { value: 'team', label: 'Team' },
];

export default function NewChallengeScreen() {
  const router = useRouter();
  const userId = useUserStore((state) => state.user?.id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🏆');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<ChallengeType>('individual');
  const [goalValue, setGoalValue] = useState('');
  const [goalUnit, setGoalUnit] = useState('STEPS');
  const [xpReward, setXpReward] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!userId) return;

    const goalValueNum = Number(goalValue);
    const xpRewardNum = Number(xpReward);

    if (!title.trim() || !goalValue || !xpReward || !startDate || !endDate) {
      Alert.alert('Missing fields', 'Title, goal, XP, and both dates are required.');
      return;
    }
    if (Number.isNaN(goalValueNum) || Number.isNaN(xpRewardNum)) {
      Alert.alert('Invalid number', 'Goal value and XP reward must be numbers.');
      return;
    }

    setSaving(true);
    try {
      await createChallenge(userId, {
        title: title.trim(),
        description: description.trim() || null,
        icon: icon.trim() || '🏆',
        category: category.trim() || null,
        type,
        goalValue: goalValueNum,
        goalUnit: goalUnit.trim(),
        xpReward: xpRewardNum,
        startDate,
        endDate,
      });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not create the challenge. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#0D1829" />
        </TouchableOpacity>
        <Text style={styles.title}>New Challenge</Text>
        <View style={{ width: 24 }} />
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

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Start date</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>End date</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, saving && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={saving}
        >
          <Text style={styles.createBtnText}>{saving ? 'Creating…' : 'Create Challenge'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F6F9' },
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
