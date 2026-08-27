'use client';

import { LeaderboardTable } from '@/components/LeaderboardTable';

export default function LeaderboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold text-[#0D1829]">Leaderboard</h1>
      <LeaderboardTable />
    </div>
  );
}
