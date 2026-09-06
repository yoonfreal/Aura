'use client';

import { useEffect, useState } from 'react';
import { CheckCircleIcon, FlameIcon, FootprintsIcon, QrCodeIcon } from '@/components/icons';
import {
  fetchAvgDailyCalories,
  fetchAvgDailySteps,
  fetchChallengeCompletionRate,
  fetchFeatureEngagement,
  fetchGymCheckInsPerWeek,
  fetchMonthlyRegistrations,
  fetchUserDemographics,
  type BreakdownBar,
  type FeatureEngagement,
  type MonthlyRegistration,
  type TrendStat,
} from '@/lib/stats';

// null means the fetch for that section failed (e.g. a table that isn't deployed yet) —
// kept distinct from "loaded but empty" so the page can say so instead of showing a fake 0.
type AnalyticsData = {
  steps: TrendStat | null;
  calories: TrendStat | null;
  gymCheckIns: TrendStat | null;
  challengeCompletion: TrendStat | null;
  registrations: MonthlyRegistration[] | null;
  demographics: { gender: BreakdownBar[]; age: BreakdownBar[] } | null;
  features: FeatureEngagement[] | null;
};

async function loadSection<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

const GENDER_COLORS: Record<string, string> = { Male: '#1F6D46', Female: '#F5B800', Others: '#8B5CF6' };
const AGE_COLOR = '#1F6D46';
const FEATURE_COLORS = ['#1F6D46', '#2E8B5C', '#3FA873', '#6FC79A', '#A8DFC0'];

function TrendCaption({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) return <p className="mt-1 text-xs font-bold text-gray-400">No data last month</p>;
  const positive = changePercent >= 0;
  return (
    <p className={`mt-1 text-xs font-bold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? '+' : ''}
      {changePercent}% vs last month
    </p>
  );
}

function StatTile({
  icon,
  stat,
  label,
  hint,
  formatValue,
}: {
  icon: React.ReactNode;
  stat: TrendStat | null;
  label: string;
  hint?: string;
  formatValue: (value: number) => string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-2xl bg-white px-4 py-6 text-center shadow-sm">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF6EF] text-[#1F6D46]">
        {icon}
      </div>
      <p className="text-2xl font-extrabold text-[#0D1829]">{stat ? formatValue(stat.value) : '—'}</p>
      <p className="mt-1 text-xs font-bold text-gray-500">{label}</p>
      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
      {stat ? <TrendCaption changePercent={stat.changePercent} /> : <p className="mt-1 text-xs font-bold text-gray-400">Data unavailable</p>}
    </div>
  );
}

function MetricRow({ label, percent, color, labelWidthClass }: { label: string; percent: number; color: string; labelWidthClass: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`shrink-0 text-xs font-bold text-gray-600 ${labelWidthClass}`}>{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-bold text-gray-500">{percent}%</span>
    </div>
  );
}

function DemographicPanel({
  title,
  bars,
  colorFor,
}: {
  title: string;
  bars: BreakdownBar[] | null;
  colorFor: (label: string) => string;
}) {
  return (
    <div className="flex-1">
      <p className="mb-3 text-xs font-bold tracking-wide text-gray-500">{title}</p>
      {bars === null ? (
        <p className="text-xs text-gray-400">Could not load.</p>
      ) : bars.length === 0 ? (
        <p className="text-xs text-gray-400">No data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {bars.map((bar) => (
            <MetricRow key={bar.label} label={bar.label.toUpperCase()} percent={bar.percent} color={colorFor(bar.label)} labelWidthClass="w-14" />
          ))}
        </div>
      )}
    </div>
  );
}

const MIN_BAR_HEIGHT = 6;
const MAX_BAR_HEIGHT = 120;

// Square-root scale rather than linear: with linear scaling, one standout month (say 20+
// signups) crushes every other bar down toward the minimum, making a month with 1-2
// registrations visually indistinguishable from a month with 0. Square-root compresses that
// gap — small counts still render as a visible, distinct bar — while a bar's tap-to-reveal
// tooltip still shows the exact number for whoever needs the precise value.
function scaledBarHeight(count: number, maxCount: number): number {
  if (maxCount <= 0) return MIN_BAR_HEIGHT;
  const scale = Math.sqrt(count) / Math.sqrt(maxCount);
  return Math.max(MIN_BAR_HEIGHT, Math.round(scale * MAX_BAR_HEIGHT));
}

function RegistrationsChart({ data }: { data: MonthlyRegistration[] | null }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  if (data === null) {
    return (
      <div className="flex flex-[1.2] flex-col">
        <p className="mb-3 text-xs font-bold tracking-wide text-gray-500">MONTHLY USER REGISTRATIONS</p>
        <p className="text-xs text-gray-400">Could not load.</p>
      </div>
    );
  }

  const maxCount = Math.max(0, ...data.map((d) => d.count));
  const currentMonth = data[data.length - 1]?.month;

  return (
    <div className="flex flex-[1.2] flex-col">
      <p className="mb-3 text-xs font-bold tracking-wide text-gray-500">MONTHLY USER REGISTRATIONS</p>
      <div className="mt-auto flex h-40 items-end gap-3">
        {data.map((d) => {
          const barHeight = scaledBarHeight(d.count, maxCount);
          const isSelected = d.month === selectedMonth;
          return (
            <button
              key={d.month}
              type="button"
              onClick={() => setSelectedMonth(isSelected ? null : d.month)}
              className="flex flex-1 cursor-pointer flex-col items-center gap-2 rounded-md bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6D46]"
            >
              <div className="relative flex h-32 w-full items-end justify-center">
                {isSelected && (
                  <span
                    className="absolute whitespace-nowrap rounded-md bg-[#0D1829] px-2 py-0.5 text-[11px] font-bold text-white shadow-sm"
                    style={{ bottom: barHeight + 6 }}
                  >
                    {d.count.toLocaleString()}
                  </span>
                )}
                <div
                  className="w-full max-w-[28px] rounded-t-md transition-colors"
                  style={{
                    height: barHeight,
                    backgroundColor: isSelected ? '#F5B800' : d.month === currentMonth ? '#1F6D46' : '#E2E5EA',
                  }}
                />
              </div>
              <span className="text-[11px] font-bold text-gray-400">{d.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AnalyticsOverview() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    Promise.all([
      loadSection(fetchAvgDailySteps()),
      loadSection(fetchAvgDailyCalories()),
      loadSection(fetchGymCheckInsPerWeek()),
      loadSection(fetchChallengeCompletionRate()),
      loadSection(fetchMonthlyRegistrations()),
      loadSection(fetchUserDemographics()),
      loadSection(fetchFeatureEngagement()),
    ]).then(([steps, calories, gymCheckIns, challengeCompletion, registrations, demographics, features]) => {
      setData({ steps, calories, gymCheckIns, challengeCompletion, registrations, demographics, features });
    });
  }, []);

  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex gap-4">
        <StatTile icon={<FootprintsIcon />} stat={data.steps} label="Avg daily steps" formatValue={(v) => v.toLocaleString()} />
        <StatTile icon={<FlameIcon />} stat={data.calories} label="Avg calories/day" formatValue={(v) => v.toLocaleString()} />
        <StatTile icon={<QrCodeIcon />} stat={data.gymCheckIns} label="Gym check-ins/week" formatValue={(v) => v.toLocaleString()} />
        <StatTile
          icon={<CheckCircleIcon />}
          stat={data.challengeCompletion}
          label="Challenge completion"
          hint="This month's joiners"
          formatValue={(v) => `${v}%`}
        />
      </div>

      <div className="mb-6 flex gap-8 rounded-2xl bg-white p-5 shadow-sm">
        <RegistrationsChart data={data.registrations} />
        <DemographicPanel
          title="GENDER"
          bars={data.demographics?.gender ?? null}
          colorFor={(label) => GENDER_COLORS[label] ?? '#94A3B8'}
        />
        <DemographicPanel title="AGE" bars={data.demographics?.age ?? null} colorFor={() => AGE_COLOR} />
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="mb-4 text-xs font-bold tracking-wide text-gray-500">TOP FEATURES BY ENGAGEMENT</p>
        {data.features === null ? (
          <p className="text-xs text-gray-400">Could not load.</p>
        ) : data.features.length === 0 ? (
          <p className="text-xs text-gray-400">No data yet.</p>
        ) : (
          <div className="space-y-4">
            {data.features.map((feature, i) => (
              <MetricRow
                key={feature.label}
                label={feature.label}
                percent={feature.percent}
                color={FEATURE_COLORS[i % FEATURE_COLORS.length]}
                labelWidthClass="w-32"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
