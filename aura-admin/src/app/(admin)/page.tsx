'use client';

import { ActiveUsersChart } from '@/components/ActiveUsersChart';
import { UsersTable } from '@/components/UsersTable';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold text-[#0D1829]">Dashboard</h1>

      <div className="mb-8">
        <ActiveUsersChart />
      </div>

      <UsersTable />
    </div>
  );
}
