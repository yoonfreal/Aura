'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/StatCard';
import { DumbbellIcon, UsersIcon, ZapIcon } from '@/components/icons';
import {
  fetchDailyActiveCounts,
  fetchGymCheckInsToday,
  fetchTotalUsers,
  fetchUserDemographics,
  type BreakdownBar,
  type DailyActiveCount,
} from '@/lib/stats';

const BAR_COLORS = ['#1B2B4B', '#F5B800', '#94A3B8', '#5B9BD5'];

function BreakdownGroup({ title, bars }: { title: string; bars: BreakdownBar[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold tracking-wide text-gray-500">{title}</p>
      {bars.length === 0 ? (
        <p className="text-xs text-gray-400">No data yet.</p>
      ) : (
        <>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-gray-100">
            {bars.map((bar, i) => (
              <div
                key={bar.label}
                style={{ width: `${bar.percent}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {bars.map((bar, i) => (
              <div key={bar.label} className="flex items-center gap-1.5 text-xs">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                />
                <span className="font-bold text-gray-600">{bar.label}</span>
                <span className="text-gray-400">{bar.percent}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ActiveUsersChart() {
  const [days, setDays] = useState<DailyActiveCount[] | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [gymCheckIns, setGymCheckIns] = useState<number | null>(null);
  const [demographics, setDemographics] = useState<{ gender: BreakdownBar[]; age: BreakdownBar[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchDailyActiveCounts(), fetchTotalUsers(), fetchGymCheckInsToday(), fetchUserDemographics()])
      .then(([counts, total, checkIns, demo]) => {
        setDays(counts);
        setTotalUsers(total);
        setGymCheckIns(checkIns);
        setDemographics(demo);
      })
      .catch(() => setError('Could not load activity stats.'));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!days) return <p className="text-sm text-gray-500">Loading…</p>;

  const todayISO = new Date().toISOString().split('T')[0];
  const today = days.find((d) => d.date === todayISO) ?? days[days.length - 1];
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="flex gap-6">
      <div className="flex w-64 shrink-0 flex-col gap-2.5">
        <StatCard icon={<UsersIcon />} iconBg="#E8F0FE" iconColor="#2563EB" label="Total Users" value={totalUsers} />
        <StatCard icon={<ZapIcon />} iconBg="#DCFCE7" iconColor="#16A34A" label="Active Today" value={today.count} />
        <StatCard icon={<DumbbellIcon />} iconBg="#FEF3C7" iconColor="#D97706" label="Gym Check-Ins Today" value={gymCheckIns} />
      </div>

      <div className="flex flex-[2] flex-col rounded-2xl bg-white p-3.5 shadow-sm">
        <p className="mb-2 text-xs font-bold tracking-wide text-gray-500">DAILY ACTIVE USERS THIS WEEK</p>
        <div className="mt-auto flex items-end gap-3">
          {days.map((d) => {
            const barHeight = Math.max(4, Math.round((d.count / max) * 80));
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative flex h-20 w-full items-end justify-center">
                  <span
                    className="absolute text-xs font-bold text-gray-500"
                    style={{ bottom: barHeight + 4 }}
                  >
                    {d.count}
                  </span>
                  <div
                    className={`w-full rounded-t-md ${d.date === today.date ? 'bg-[#1B2B4B]' : 'bg-gray-200'}`}
                    style={{ height: barHeight }}
                  />
                </div>
                <span className="text-xs text-gray-400">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-[2.2] flex-col gap-5 rounded-2xl bg-white p-3.5 shadow-sm">
        <p className="text-xs font-bold tracking-wide text-gray-500">USER OVERVIEW</p>
        <BreakdownGroup title="GENDER" bars={demographics?.gender ?? []} />
        <BreakdownGroup title="AGE" bars={demographics?.age ?? []} />
      </div>
    </div>
  );
}
