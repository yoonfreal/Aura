'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/StatCard';
import { UsersTable } from '@/components/UsersTable';
import { SuspiciousActivityPanel } from '@/components/SuspiciousActivityPanel';
import { ZapIcon, UsersIcon, FlagIcon } from '@/components/icons';
import { fetchDailyActiveCounts, fetchFlaggedCount, fetchTotalUsers } from '@/lib/stats';
import { thailandDateISO } from '@/lib/thailandTime';

export default function UserManagementPage() {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [activeToday, setActiveToday] = useState<number | null>(null);
  const [flaggedCount, setFlaggedCount] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([fetchTotalUsers(), fetchDailyActiveCounts(), fetchFlaggedCount()])
      .then(([total, days, flagged]) => {
        const todayISO = thailandDateISO();
        const today = days.find((d) => d.date === todayISO) ?? days[days.length - 1];
        setTotalUsers(total);
        setActiveToday(today.count);
        setFlaggedCount(flagged);
      })
      .catch(() => {
        // Stat cards are supplementary — leave them blank rather than blocking the table below.
      });
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold text-[#0D1829]">User Management</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="grid gap-6">
          <div className="flex gap-4">
            <StatCard icon={<UsersIcon />} iconBg="#E8F0FE" iconColor="#2563EB" label="Total Users" value={totalUsers ?? '—'} />
            <StatCard icon={<ZapIcon />} iconBg="#DCFCE7" iconColor="#16A34A" label="Active Today" value={activeToday ?? '—'} />
          </div>
          <UsersTable />
        </div>

        <div className="grid gap-6">
          <StatCard icon={<FlagIcon />} iconBg="#FEF3C7" iconColor="#B45309" label="Flagged Accounts" value={flaggedCount ?? '—'} />
          <SuspiciousActivityPanel />
        </div>
      </div>
    </div>
  );
}
