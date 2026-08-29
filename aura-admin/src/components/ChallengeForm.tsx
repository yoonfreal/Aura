'use client';

import { useState } from 'react';
import { NO_LIMIT_DAYS, addDaysISO, todayISO } from '@/lib/dates';
import type { ChallengeType, NewChallenge } from '@/lib/types';

const TYPE_OPTIONS: { value: ChallengeType; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: '1v1', label: '1v1' },
  { value: 'team', label: 'Team' },
];

type DurationUnit = 'day' | 'week' | 'month' | 'year';

const DURATION_UNIT_DAYS: Record<DurationUnit, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

const DURATION_UNIT_OPTIONS: { value: DurationUnit; label: string }[] = [
  { value: 'day', label: 'Day(s)' },
  { value: 'week', label: 'Week(s)' },
  { value: 'month', label: 'Month(s)' },
  { value: 'year', label: 'Year(s)' },
];

// Picks the largest unit that divides evenly so a stored value like 90 shows back as
// "3 Month(s)" instead of "90 Day(s)" — falls back to days for anything that doesn't
// line up with a whole week/month/year.
function decomposeDurationDays(days: number): { value: string; unit: DurationUnit } {
  if (days % 365 === 0 && days >= 365) return { value: String(days / 365), unit: 'year' };
  if (days % 30 === 0 && days >= 30) return { value: String(days / 30), unit: 'month' };
  if (days % 7 === 0 && days >= 7) return { value: String(days / 7), unit: 'week' };
  return { value: String(days), unit: 'day' };
}

const GOAL_UNIT_OPTIONS = ['STEPS', 'CALORIES', 'KM'] as const;

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
  durationValue: string;
  durationUnit: DurationUnit;
  endDate: string | null;
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
  durationValue: '1',
  durationUnit: 'week',
  endDate: addDaysISO(todayISO(), 6),
  badgeName: '',
  badgeIcon: '',
};

export function resolveEndDate(values: ChallengeFormValues, startDate: string): string {
  if (values.type === 'team') {
    return addDaysISO(startDate, values.durationDays === null ? NO_LIMIT_DAYS : values.durationDays - 1);
  }
  return values.endDate ?? addDaysISO(startDate, NO_LIMIT_DAYS);
}

// A challenge saved with "no expiration" has its end date stamped ~100 years out (see
// NO_LIMIT_DAYS) rather than stored as null, so editing one needs to recognize that stamp
// and show "No expiration" again instead of a random date a century away.
function daysBetween(startISO: string, endISO: string): number {
  return Math.round(
    (new Date(`${endISO}T00:00:00Z`).getTime() - new Date(`${startISO}T00:00:00Z`).getTime()) / 86400000,
  );
}

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
  startDate: string;
  endDate: string;
  badgeName: string | null;
  badgeIcon: string | null;
}): ChallengeFormValues {
  const isNoLimit = c.type !== 'team' && daysBetween(c.startDate, c.endDate) >= 3650;
  const { value: durationValue, unit: durationUnit } =
    c.durationDays !== null ? decomposeDurationDays(c.durationDays) : { value: '1', unit: 'month' as DurationUnit };
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
    durationValue,
    durationUnit,
    endDate: isNoLimit ? null : c.endDate,
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

  function set<K extends keyof ChallengeFormValues>(key: K, value: ChallengeFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setDuration(durationValue: string, durationUnit: DurationUnit) {
    const n = Number(durationValue);
    const durationDays = durationValue.trim() && n > 0 ? Math.round(n * DURATION_UNIT_DAYS[durationUnit]) : null;
    setValues((v) => ({ ...v, durationValue, durationUnit, durationDays }));
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
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
      <Field label="Title" className="sm:col-span-2">
        <div className="flex gap-2">
          <input
            className={emojiInputClass}
            value={values.icon}
            onChange={(e) => set('icon', e.target.value)}
            placeholder="🏆"
          />
          <input
            className={inputClass}
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="10K Steps Challenge"
          />
        </div>
      </Field>

      <Field label="Description" className="sm:col-span-2">
        <textarea
          className={inputClass}
          rows={3}
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Reach 10,000 steps every day this week"
        />
      </Field>

      <Field label="Type" className="sm:col-span-2">
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

      {values.type === 'team' ? (
        <Field label="Duration (shared by the whole team, from when it is created)" className="sm:col-span-2">
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              className={inputClass}
              value={values.durationValue}
              disabled={values.durationDays === null}
              onChange={(e) => setDuration(e.target.value, values.durationUnit)}
              placeholder="3"
            />
            <select
              className={inputClass}
              value={values.durationUnit}
              disabled={values.durationDays === null}
              onChange={(e) => setDuration(values.durationValue, e.target.value as DurationUnit)}
            >
              {DURATION_UNIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs font-bold text-gray-500">
            <input
              type="checkbox"
              checked={values.durationDays === null}
              onChange={(e) => (e.target.checked ? set('durationDays', null) : setDuration(values.durationValue || '1', values.durationUnit))}
            />
            No limit
          </label>
        </Field>
      ) : (
        <Field
          label={
            values.type === '1v1'
              ? 'Expires on (last day to start a race)'
              : 'Expires on (last day this challenge runs)'
          }
          className="sm:col-span-2"
        >
          <div className="flex items-center gap-2">
            <input
              type="date"
              className={inputClass}
              min={todayISO()}
              value={values.endDate ?? ''}
              disabled={values.endDate === null}
              onChange={(e) => set('endDate', e.target.value || null)}
            />
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs font-bold text-gray-500">
            <input
              type="checkbox"
              checked={values.endDate === null}
              onChange={(e) => set('endDate', e.target.checked ? null : addDaysISO(todayISO(), 6))}
            />
            No expiration date
          </label>
        </Field>
      )}

      <Field label="Goal" className="sm:col-span-2">
        <div className="flex gap-2">
          <input
            type="number"
            className={inputClass}
            value={values.goalValue}
            onChange={(e) => set('goalValue', e.target.value)}
            placeholder="10000"
          />
          <select
            className={inputClass}
            value={goalUnitUpper}
            onChange={(e) => set('goalUnit', e.target.value)}
          >
            {GOAL_UNIT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
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

      <Field label="Badge (optional)">
        <div className="flex gap-2">
          <input
            className={emojiInputClass}
            value={values.badgeIcon}
            onChange={(e) => set('badgeIcon', e.target.value)}
            placeholder="🥾"
          />
          <input
            className={inputClass}
            value={values.badgeName}
            onChange={(e) => set('badgeName', e.target.value)}
            placeholder="10K Walker"
          />
        </div>
      </Field>

      {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-2 rounded-xl bg-[#F5B800] py-3 text-sm font-extrabold text-[#1B2B4B] disabled:opacity-60 sm:col-span-2"
      >
        {saving ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1 ${className}`}>
      <span className="text-[11px] font-bold text-gray-500">{label}</span>
      {children}
    </label>
  );
}

const fieldBaseClass =
  'rounded-xl border border-transparent bg-gray-100 py-2.5 text-sm text-black outline-none transition focus:border-[#1B2B4B] focus:bg-white';

const inputClass = `w-full px-3.5 ${fieldBaseClass}`;

// A fixed, non-stretching width for the one-emoji badge icon slot — kept as its own class
// (rather than appending `w-12` onto inputClass) since inputClass's own `w-full` would
// otherwise win the cascade regardless of class order in the string.
const emojiInputClass = `w-12 shrink-0 px-0 text-center ${fieldBaseClass}`;

function chipClass(active: boolean) {
  return `flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
    active ? 'border-[#1B2B4B] bg-[#1B2B4B] text-white' : 'border-transparent bg-gray-100 text-gray-500'
  }`;
}
