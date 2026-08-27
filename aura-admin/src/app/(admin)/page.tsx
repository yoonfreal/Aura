'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { deleteChallenge, fetchAllChallenges } from '@/lib/challenges';
import { ActiveUsersChart } from '@/components/ActiveUsersChart';
import type { Challenge } from '@/lib/types';

const TYPE_LABEL: Record<Challenge['type'], string> = {
  individual: 'Individual',
  '1v1': '1v1',
  team: 'Team',
};

export default function DashboardPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setChallenges(await fetchAllChallenges());
      setError(null);
    } catch {
      setError('Could not load challenges.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(challenge: Challenge) {
    if (!confirm(`Delete "${challenge.title}"? This removes it for everyone who joined.`)) return;
    await deleteChallenge(challenge.id);
    load();
  }

  return (
    <div>
      <div className="mb-8">
        <ActiveUsersChart />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-[#0D1829]">Challenges</h1>
        <Link
          href="/challenges/new"
          className="rounded-xl bg-[#F5B800] px-4 py-2 text-sm font-extrabold text-[#1B2B4B]"
        >
          + New Challenge
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : challenges.length === 0 ? (
        <p className="text-sm text-gray-500">No challenges yet — create one to get started.</p>
      ) : (
        <div className="grid gap-3">
          {challenges.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-bold text-[#0D1829]">
                  {c.icon} {c.title}
                </p>
                <p className="text-xs text-gray-500">
                  {TYPE_LABEL[c.type]} · {c.goalValue.toLocaleString()} {c.goalUnit} · {c.xpReward} XP
                </p>
                <p className="text-xs text-gray-400">
                  {c.startDate} → {c.endDate}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/challenges/${c.id}`}
                  className="text-sm font-bold text-[#1B2B4B] underline"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(c)}
                  className="text-sm font-bold text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
