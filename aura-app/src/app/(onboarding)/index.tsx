import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/userStore';
import type {
  ActivityLevel,
  DaysPerWeek,
  FitnessGoal,
  Gender,
  PreferredActivity,
  PreferredTime,
  WorkoutExperience,
} from '@/types';

type Answers = {
  age: string;
  gender: Gender | null;
  fitnessGoal: FitnessGoal | null;
  activityLevel: ActivityLevel | null;
  workoutExperience: WorkoutExperience | null;
  preferredActivities: PreferredActivity[];
  daysPerWeek: DaysPerWeek | null;
  preferredTime: PreferredTime | null;
};

const initialAnswers: Answers = {
  age: '',
  gender: null,
  fitnessGoal: null,
  activityLevel: null,
  workoutExperience: null,
  preferredActivities: [],
  daysPerWeek: null,
  preferredTime: null,
};

type Option<T extends string> = { label: string; value: T };

type Question =
  | { id: 'age'; kind: 'number'; title: string; placeholder: string }
  | { id: 'gender'; kind: 'single'; title: string; options: Option<Gender>[] }
  | { id: 'fitnessGoal'; kind: 'single'; title: string; options: Option<FitnessGoal>[] }
  | { id: 'activityLevel'; kind: 'single'; title: string; options: Option<ActivityLevel>[] }
  | { id: 'workoutExperience'; kind: 'single'; title: string; options: Option<WorkoutExperience>[] }
  | { id: 'preferredActivities'; kind: 'multi'; title: string; options: Option<PreferredActivity>[] }
  | { id: 'daysPerWeek'; kind: 'single'; title: string; options: Option<DaysPerWeek>[] }
  | { id: 'preferredTime'; kind: 'single'; title: string; options: Option<PreferredTime>[] };

const questions: Question[] = [
  { id: 'age', kind: 'number', title: 'How old are you?', placeholder: 'Age' },
  {
    id: 'gender',
    kind: 'single',
    title: 'Gender',
    options: [
      { label: 'Male', value: 'male' },
      { label: 'Female', value: 'female' },
      { label: 'Other', value: 'other' },
      { label: 'Prefer not to say', value: 'prefer_not_to_say' },
    ],
  },
  {
    id: 'fitnessGoal',
    kind: 'single',
    title: "What's your main fitness goal?",
    options: [
      { label: 'Lose weight', value: 'lose_weight' },
      { label: 'Build muscle', value: 'build_muscle' },
      { label: 'Improve endurance', value: 'improve_endurance' },
      { label: 'Stay generally active', value: 'stay_active' },
    ],
  },
  {
    id: 'activityLevel',
    kind: 'single',
    title: 'Current activity level?',
    options: [
      { label: 'Sedentary (little to no exercise)', value: 'sedentary' },
      { label: 'Lightly active (1-2 days/week)', value: 'lightly_active' },
      { label: 'Moderately active (3-4 days/week)', value: 'moderately_active' },
      { label: 'Very active (5+ days/week)', value: 'very_active' },
    ],
  },
  {
    id: 'workoutExperience',
    kind: 'single',
    title: 'Workout experience?',
    options: [
      { label: 'Just starting out', value: 'beginner' },
      { label: 'Less than 6 months', value: 'under_6_months' },
      { label: '6 months – 2 years', value: '6_months_2_years' },
      { label: '2+ years', value: '2_plus_years' },
    ],
  },
  {
    id: 'preferredActivities',
    kind: 'multi',
    title: 'Preferred activities?',
    options: [
      { label: 'Gym / weights', value: 'gym' },
      { label: 'Running', value: 'running' },
      { label: 'Yoga / stretching', value: 'yoga' },
      { label: 'Sports', value: 'sports' },
      { label: 'Walking', value: 'walking' },
      { label: 'Cycling', value: 'cycling' },
    ],
  },
  {
    id: 'daysPerWeek',
    kind: 'single',
    title: 'How many days a week can you commit?',
    options: [
      { label: '1-2 days', value: '1_2' },
      { label: '3-4 days', value: '3_4' },
      { label: '5-6 days', value: '5_6' },
      { label: 'Every day', value: 'every_day' },
    ],
  },
  {
    id: 'preferredTime',
    kind: 'single',
    title: 'Preferred workout time?',
    options: [
      { label: 'Morning', value: 'morning' },
      { label: 'Afternoon', value: 'afternoon' },
      { label: 'Evening', value: 'evening' },
      { label: 'Varies', value: 'varies' },
    ],
  },
];

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function OnboardingScreen() {
  const user = useUserStore((s) => s.user);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [submitting, setSubmitting] = useState(false);

  const question = questions[step];
  const isLastStep = step === questions.length - 1;

  function isAnswered(): boolean {
    if (question.kind === 'number') return answers.age.trim().length > 0;
    if (question.kind === 'multi') return answers.preferredActivities.length > 0;
    return answers[question.id] !== null;
  }

  function selectSingle(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }

  function toggleMulti(value: PreferredActivity) {
    setAnswers((prev) => {
      const exists = prev.preferredActivities.includes(value);
      return {
        ...prev,
        preferredActivities: exists
          ? prev.preferredActivities.filter((v) => v !== value)
          : [...prev.preferredActivities, value],
      };
    });
  }

  function handleBack() {
    if (step === 0) return;
    setStep((s) => s - 1);
  }

  async function handleNext() {
    if (!isAnswered()) return;
    if (!isLastStep) {
      setStep((s) => s + 1);
      return;
    }
    await handleFinish();
  }

  async function handleFinish() {
    if (!user) return;
    setSubmitting(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        age: Number(answers.age),
        gender: answers.gender,
        fitness_goal: answers.fitnessGoal,
        activity_level: answers.activityLevel,
        workout_experience: answers.workoutExperience,
        preferred_activities: answers.preferredActivities,
        days_per_week: answers.daysPerWeek,
        preferred_time: answers.preferredTime,
        onboarding_completed: true,
      })
      .eq('id', user.id);

    setSubmitting(false);

    if (error) {
      Alert.alert('Something went wrong', error.message);
      return;
    }

    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((step + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.stepLabel}>
            Question {step + 1} of {questions.length}
          </Text>
          <Text style={styles.title}>{question.title}</Text>

          {question.kind === 'number' ? (
            <TextInput
              style={styles.input}
              placeholder={question.placeholder}
              placeholderTextColor="#999"
              keyboardType="number-pad"
              value={answers.age}
              onChangeText={(t) => setAnswers((prev) => ({ ...prev, age: t.replace(/[^0-9]/g, '') }))}
            />
          ) : (
            <View style={styles.options}>
              {question.options.map((opt, i) => {
                const selected =
                  question.kind === 'multi'
                    ? answers.preferredActivities.includes(opt.value as PreferredActivity)
                    : answers[question.id] === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() =>
                      question.kind === 'multi'
                        ? toggleMulti(opt.value as PreferredActivity)
                        : selectSingle(opt.value)
                    }
                  >
                    <View style={[styles.badge, selected && styles.badgeSelected]}>
                      <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>
                        {LETTERS[i]}
                      </Text>
                    </View>
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextButton, !isAnswered() && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!isAnswered() || submitting}
          >
            <Text style={styles.nextButtonText}>
              {submitting ? 'Saving...' : isLastStep ? 'Finish' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.skyBackground,
  },
  flex: {
    flex: 1,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#D6E8F5',
    marginHorizontal: 28,
    marginTop: 12,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 24,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A92AA',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    height: 54,
    paddingHorizontal: 16,
    fontSize: 18,
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  optionSelected: {
    backgroundColor: Colors.navy,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.skyBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSelected: {
    backgroundColor: Colors.gold,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  badgeTextSelected: {
    color: Colors.navy,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flexShrink: 1,
  },
  optionTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 28,
    paddingBottom: 20,
    paddingTop: 12,
  },
  backButton: {
    flex: 1,
    height: 54,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: Colors.navy,
    fontSize: 16,
    fontWeight: '700',
  },
  nextButton: {
    flex: 2,
    height: 54,
    borderRadius: 12,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
