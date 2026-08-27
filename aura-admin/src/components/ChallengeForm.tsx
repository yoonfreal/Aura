'use client';

import { useState } from 'react';
import type { ChallengeType, NewChallenge } from '@/lib/types';

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

const GOAL_UNIT_OPTIONS = ['STEPS', 'CALORIES', 'MINUTES', 'KM', 'REPS', 'CUSTOM'] as const;

export type ChallengeFormValues = {
  title: string;
  description: string;
  icon: string;
  category: string;
  type: ChallengeType;
  goalValue: string;
  goalUnit: string;
  xpReward: string;
  durationDays: number | null;
  badgeName: string;
  badgeIcon: string;
};

export const emptyChallengeForm: ChallengeFormValues = {
  title: '',
  description: '',
  icon: '🏆',
  category: '',
  type: 'individual',
  goalValue: '',
  goalUnit: 'STEPS',
  xpReward: '',
  durationDays: 7,
  badgeName: '',
  badgeIcon: '',
};

export function toNewChallenge(values: ChallengeFormValues): NewChallenge | null {
  const goalValueNum = Number(values.goalValue);
  const xpRewardNum = Number(values.xpReward);

  if (!values.title.trim() || !values.goalValue || !values.xpReward || !values.goalUnit.trim()) {
    return null;
  }
  if (Number.isNaN(goalValueNum) || Number.isNaN(xpRewardNum)) return null;

  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    icon: values.icon.trim() || '🏆',
    category: values.category.trim() || null,
    type: values.type,
    goalValue: goalValueNum,
    goalUnit: values.goalUnit.trim().toUpperCase(),
    xpReward: xpRewardNum,
    startDate: '',
    endDate: '',
    durationDays: values.type === 'team' ? values.durationDays : null,
    badgeName: values.badgeName.trim() || null,
    badgeIcon: values.badgeIcon.trim() || null,
  };
}

export function fromChallenge(c: {
  title: string;
  description: string | null;
  icon: string;
  category: string | null;
  type: ChallengeType;
  goalValue: number;
  goalUnit: string;
  xpReward: number;
  durationDays: number | null;
  badgeName: string | null;
  badgeIcon: string | null;
}): ChallengeFormValues {
  return {
    title: c.title,
    description: c.description ?? '',
    icon: c.icon,
    category: c.category ?? '',
    type: c.type,
    goalValue: String(c.goalValue),
    goalUnit: c.goalUnit.toUpperCase(),
    xpReward: String(c.xpReward),
    durationDays: c.durationDays,
    badgeName: c.badgeName ?? '',
    badgeIcon: c.badgeIcon ?? '',
  };
}

export function ChallengeForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: ChallengeFormValues;
  submitLabel: string;
  onSubmit: (values: ChallengeFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ChallengeFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const goalUnitUpper = values.goalUnit.trim().toUpperCase();
  const isCustomGoalUnit = !(GOAL_UNIT_OPTIONS as readonly string[]).includes(goalUnitUpper);

  function set<K extends keyof ChallengeFormValues>(key: K, value: ChallengeFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (toNewChallenge(values) === null) {
      setFormError('Title, goal value, goal unit, and XP reward are required.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await onSubmit(values);
    } catch {
      setFormError('Could not save the challenge. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid max-w-xl gap-4">
      <Field label="Title">
        <input
          className={inputClass}
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="10K Steps Challenge"
        />
      </Field>

      <Field label="Description">
        <textarea
          className={inputClass}
          rows={3}
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Reach 10,000 steps every day this week"
        />
      </Field>

      <Field label="Type">
        <div className="flex gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => set('type', opt.value)}
              className={chipClass(values.type === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label={
          values.type === 'team'
            ? 'Duration (shared by the whole team, from when it is created)'
            : values.type === '1v1'
              ? 'Duration (how long this is open to start a race in)'
              : 'Duration (how long this challenge runs for everyone)'
        }
      >
        <div className="flex gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.label}
              onClick={() => set('durationDays', opt.value)}
              className={chipClass(values.durationDays === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Category (optional, e.g. Sport)">
        <input
          className={inputClass}
          value={values.category}
          onChange={(e) => set('category', e.target.value)}
          placeholder="Sport"
        />
      </Field>

      <Field label="Icon (emoji)">
        <input
          className={inputClass}
          value={values.icon}
          onChange={(e) => set('icon', e.target.value)}
          placeholder="🏆"
        />
      </Field>

      <Field label="Goal value">
        <input
          type="number"
          className={inputClass}
          value={values.goalValue}
          onChange={(e) => set('goalValue', e.target.value)}
          placeholder="10000"
        />
      </Field>

      <Field label="Goal unit">
        <select
          className={inputClass}
          value={isCustomGoalUnit ? 'CUSTOM' : goalUnitUpper}
          onChange={(e) => set('goalUnit', e.target.value === 'CUSTOM' ? '' : e.target.value)}
        >
          {GOAL_UNIT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {isCustomGoalUnit && (
          <input
            className={`${inputClass} mt-2`}
            value={values.goalUnit}
            onChange={(e) => set('goalUnit', e.target.value.toUpperCase())}
            placeholder="e.g. LAPS"
          />
        )}
      </Field>

      <Field label="XP reward">
        <input
          type="number"
          className={inputClass}
          value={values.xpReward}
          onChange={(e) => set('xpReward', e.target.value)}
          placeholder="500"
        />
      </Field>

      <Field label="Badge name (optional)">
        <input
          className={inputClass}
          value={values.badgeName}
          onChange={(e) => set('badgeName', e.target.value)}
          placeholder="10K Walker"
        />
      </Field>

      <Field label="Badge icon (emoji, optional)">
        <input
          className={inputClass}
          value={values.badgeIcon}
          onChange={(e) => set('badgeIcon', e.target.value)}
          placeholder="🥾"
        />
      </Field>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-2 rounded-xl bg-[#F5B800] py-3 text-sm font-extrabold text-[#1B2B4B] disabled:opacity-60"
      >
        {saving ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-bold text-gray-500">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#0D1829] outline-none focus:border-[#1B2B4B]';

function chipClass(active: boolean) {
  return `flex-1 rounded-lg border px-3 py-2 text-sm font-bold ${
    active ? 'border-[#1B2B4B] bg-[#1B2B4B] text-white' : 'border-gray-200 bg-white text-gray-500'
  }`;
}
