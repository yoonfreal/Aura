'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/StatCard';
import { CheckCircleIcon, RepeatIcon, ShieldIcon, TargetIcon, UserIcon, UsersIcon } from '@/components/icons';
import {
  deleteChallenge,
  fetchAllChallenges,
  fetchChallengeParticipantData,
  type ChallengeParticipantCounts,
} from '@/lib/challenges';
import { fetchTotalUsers } from '@/lib/stats';
import type { Challenge, ChallengeType } from '@/lib/types';

const TYPE_LABEL: Record<ChallengeType, string> = {
  individual: 'Individual',
  '1v1': '1v1',
  team: 'Team',
};

const TYPE_BADGE_STYLE: Record<ChallengeType, string> = {
  individual: 'bg-emerald-50 text-emerald-700',
  '1v1': 'bg-purple-50 text-purple-700',
  team: 'bg-amber-50 text-amber-700',
};

const COMPLETION_BOX: Record<ChallengeType, { icon: React.ReactNode; iconBg: string; iconColor: string }> = {
  individual: { icon: <UserIcon />, iconBg: '#DCFCE7', iconColor: '#16A34A' },
  '1v1': { icon: <RepeatIcon />, iconBg: '#F3E8FF', iconColor: '#9333EA' },
  team: { icon: <ShieldIcon />, iconBg: '#FEF3C7', iconColor: '#D97706' },
};

type SortKey = 'date' | 'joined' | 'name';
type SortDir = 'asc' | 'desc';

const SORT_OPTIONS: { value: string; label: string; key: SortKey; dir: SortDir }[] = [
  { value: 'date-desc', label: 'Newest first', key: 'date', dir: 'desc' },
  { value: 'date-asc', label: 'Oldest first', key: 'date', dir: 'asc' },
  { value: 'joined-desc', label: 'Most joined', key: 'joined', dir: 'desc' },
  { value: 'name-asc', label: 'Name (A–Z)', key: 'name', dir: 'asc' },
];

const panelSelectClass =
  'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-black outline-none focus:border-[#1B2B4B]';

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [counts, setCounts] = useState<Map<string, ChallengeParticipantCounts>>(new Map());
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ChallengeType>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const [challengeList, participantData, userCount] = await Promise.all([
        fetchAllChallenges(),
        fetchChallengeParticipantData(),
        fetchTotalUsers(),
      ]);
      setChallenges(challengeList);
      setCounts(participantData.countsByChallenge);
      setTotalParticipants(participantData.totalParticipants);
      setTotalUsers(userCount);
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleDelete(challenge: Challenge) {
    if (!confirm(`Delete "${challenge.title}"? This removes it for everyone who joined.`)) return;
    await deleteChallenge(challenge.id);
    load();
  }

  // Completion only means something within a type — a 1v1 always resolves 1-for-1 while a
  // team challenge can involve dozens of joiners for one shared goal — so the rate is
  // broken out per type rather than blended into one number.
  const statsByType: Record<ChallengeType, ChallengeParticipantCounts> = {
    individual: { joined: 0, completed: 0 },
    '1v1': { joined: 0, completed: 0 },
    team: { joined: 0, completed: 0 },
  };
  for (const c of challenges) {
    const rowCounts = counts.get(c.id) ?? { joined: 0, completed: 0 };
    statsByType[c.type].joined += rowCounts.joined;
    statsByType[c.type].completed += rowCounts.completed;
  }
  function completionRateFor(type: ChallengeType): number {
    const { joined, completed } = statsByType[type];
    return joined === 0 ? 0 : Math.round((completed / joined) * 100);
  }

  const rows = challenges
    .filter((c) => c.title.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((c) => typeFilter === 'all' || c.type === typeFilter);

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.title.localeCompare(b.title);
    else if (sortKey === 'joined') cmp = (counts.get(a.id)?.joined ?? 0) - (counts.get(b.id)?.joined ?? 0);
    else cmp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-[#0D1829]">Challenges</h1>
        <Link
          href="/challenges/new"
          className="rounded-xl bg-[#F5B800] px-4 py-2 text-sm font-extrabold text-[#1B2B4B]"
        >
          + New Challenge
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-2.5">
        <StatCard
          icon={<UsersIcon />}
          iconBg="#EDE9FE"
          iconColor="#7C3AED"
          value={totalUsers.toLocaleString()}
          label="Total Users"
        />
        <StatCard
          icon={<TargetIcon />}
          iconBg="#E8F0FE"
          iconColor="#2563EB"
          value={challenges.length.toLocaleString()}
          label="Total Challenges"
        />
        <StatCard
          icon={<UsersIcon />}
          iconBg="#CCFBF1"
          iconColor="#0D9488"
          value={totalParticipants.toLocaleString()}
          label="Total Participants"
        />
        <div className="flex flex-1 items-center gap-2.5 rounded-xl bg-white p-2.5 shadow-sm">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: '#E0E7FF', color: '#4F46E5' }}
          >
            <CheckCircleIcon />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-gray-500">Completion Rate</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-1">
              {(Object.keys(COMPLETION_BOX) as ChallengeType[]).map((type) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: COMPLETION_BOX[type].iconColor }}
                  />
                  <span className="text-xs font-bold text-gray-500">{TYPE_LABEL[type]}</span>
                  <span className="text-xs text-gray-700">{completionRateFor(type)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold tracking-wide text-gray-500">ALL CHALLENGES</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-52 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-black outline-none focus:border-[#1B2B4B]"
            />
            <div className="relative" ref={filtersRef}>
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                aria-label="Filters"
                className={`relative flex h-9 w-9 items-center justify-center rounded-lg border ${
                  filtersOpen ? 'border-[#1B2B4B] text-[#1B2B4B]' : 'border-gray-200 text-gray-500'
                } hover:border-[#1B2B4B] hover:text-[#1B2B4B]`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                {(sortKey !== 'date' || sortDir !== 'desc' || typeFilter !== 'all') && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#F5B800]" />
                )}
              </button>

              {filtersOpen && (
                <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-4 shadow-md">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold tracking-wide text-gray-500">FILTERS</p>
                    <button
                      onClick={() => {
                        setSortKey('date');
                        setSortDir('desc');
                        setTypeFilter('all');
                      }}
                      className="text-xs font-bold text-[#1B2B4B] hover:underline"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="grid gap-4">
                    <label className="grid gap-1">
                      <span className="text-[11px] font-bold text-gray-500">Sort by</span>
                      <select
                        className={panelSelectClass}
                        value={SORT_OPTIONS.find((o) => o.key === sortKey && o.dir === sortDir)?.value ?? ''}
                        onChange={(e) => {
                          const opt = SORT_OPTIONS.find((o) => o.value === e.target.value);
                          if (opt) {
                            setSortKey(opt.key);
                            setSortDir(opt.dir);
                          }
                        }}
                      >
                        {SORT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-[11px] font-bold text-gray-500">Type</span>
                      <select
                        className={panelSelectClass}
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as 'all' | ChallengeType)}
                      >
                        <option value="all">All types</option>
                        {(Object.keys(TYPE_LABEL) as ChallengeType[]).map((type) => (
                          <option key={type} value={type}>
                            {TYPE_LABEL[type]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500">
                <th className="rounded-l-lg px-3 py-2">Name</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2">Completed</th>
                <th className="rounded-r-lg px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const rowCounts = counts.get(c.id) ?? { joined: 0, completed: 0 };
                return (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="px-3 py-3">
                      <span className="truncate font-bold text-[#0D1829]">
                        {c.icon} {c.title}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${TYPE_BADGE_STYLE[c.type]}`}>
                        {TYPE_LABEL[c.type]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {new Date(`${c.startDate}T00:00:00`).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-3 py-3 text-gray-600">{rowCounts.joined}</td>
                    <td className="px-3 py-3 text-gray-600">{rowCounts.completed}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/challenges/${c.id}`}
                          aria-label={`Edit ${c.title}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-[#1B2B4B] hover:text-[#1B2B4B]"
                        >
                          <PencilIcon />
                        </Link>
                        <button
                          onClick={() => handleDelete(c)}
                          aria-label={`Delete ${c.title}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-red-600 hover:border-red-600"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    No challenges found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
