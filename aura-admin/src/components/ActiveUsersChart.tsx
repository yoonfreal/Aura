'use client';

import { useEffect, useState } from 'react';
import { fetchDailyActiveCounts, fetchTotalUsers, type DailyActiveCount } from '@/lib/stats';

export function ActiveUsersChart() {
  const [days, setDays] = useState<DailyActiveCount[] | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchDailyActiveCounts(), fetchTotalUsers()])
      .then(([counts, total]) => {
        setDays(counts);
        setTotalUsers(total);
      })
      .catch(() => setError('Could not load activity stats.'));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!days) return <p className="text-sm text-gray-500">Loading…</p>;

  const today = days[days.length - 1];
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-xs font-bold text-gray-500">Total Users</p>
        <p className="mt-1 text-3xl font-extrabold text-[#0D1829]">{totalUsers}</p>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-xs font-bold text-gray-500">Active Today</p>
        <p className="mt-1 text-3xl font-extrabold text-[#0D1829]">{today.count}</p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm sm:col-span-2">
        <p className="mb-4 text-xs font-bold tracking-wide text-gray-500">DAILY ACTIVE USERS THIS WEEK</p>
        <div className="flex h-40 items-end gap-3">
          {days.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-bold text-gray-500">{d.count}</span>
              <div
                className={`w-full rounded-t-md ${d.date === today.date ? 'bg-[#1B2B4B]' : 'bg-gray-200'}`}
                style={{ height: `${(d.count / max) * 100}%`, minHeight: 4 }}
              />
              <span className="text-xs text-gray-400">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
