'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchLeaderboard, type LeaderboardEntry, type LeaderboardPeriod } from '@/lib/leaderboard';

// Same palette style as UsersTable's initial-letter avatars — this app has no profile
// photos, just colored initials.
const AVATAR_COLORS = ['#1E4D8C', '#744210', '#065F46', '#5B21B6', '#831843', '#3D2B1F'];

function avatarColorFor(username: string): string {
  const sum = Array.from(username).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// Same tier colors as UsersTable's Title column, so a user's level title reads the same
// way on both pages.
const TITLE_STYLES: Record<string, string> = {
  Beginner: 'bg-indigo-100 text-indigo-700',
  Rookie: 'bg-rose-100 text-rose-700',
  Warrior: 'bg-orange-100 text-orange-700',
  Athlete: 'bg-purple-100 text-purple-700',
  Elite: 'bg-amber-100 text-amber-700',
  Legend: 'bg-[#1B2B4B] text-white',
};

const LEVEL_TIERS = ['Beginner', 'Rookie', 'Warrior', 'Athlete', 'Elite', 'Legend'];

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'overall', label: 'Overall' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

type SortKey = 'rank' | 'username' | 'challengesJoined' | 'level' | 'xp';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'username', label: 'Name' },
  { key: 'level', label: 'Level' },
  { key: 'xp', label: 'XP' },
  { key: 'challengesJoined', label: 'Challenges Joined' },
];

const SORT_OPTIONS: { value: string; label: string; key: SortKey; dir: SortDir }[] = [
  { value: 'rank-asc', label: 'Rank (default)', key: 'rank', dir: 'asc' },
  { value: 'xp-desc', label: 'XP (high–low)', key: 'xp', dir: 'desc' },
  { value: 'xp-asc', label: 'XP (low–high)', key: 'xp', dir: 'asc' },
  { value: 'name-asc', label: 'Name (A–Z)', key: 'username', dir: 'asc' },
  { value: 'challengesJoined-desc', label: 'Most challenges joined', key: 'challengesJoined', dir: 'desc' },
  { value: 'level-desc', label: 'Level (high–low)', key: 'level', dir: 'desc' },
];

const panelSelectClass =
  'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-black outline-none focus:border-[#1B2B4B]';

export function LeaderboardTable() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('overall');
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [titleFilter, setTitleFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      setEntries(null);
      try {
        setEntries(await fetchLeaderboard(period));
      } catch {
        setError('Could not load the leaderboard.');
      }
    }
    load();
  }, [period]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  // Rank reflects each user's place in the full period ranking, computed before search/
  // filter/sort are applied, so it always shows a user's true leaderboard position — even
  // when the visible rows are re-sorted by Name or filtered down to one Title tier.
  const ranked = (entries ?? []).map((entry, i) => ({ ...entry, rank: i + 1 }));

  const rows = ranked
    .filter((e) => e.username.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((e) => titleFilter === 'all' || e.levelTitle === titleFilter);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'username' ? 'asc' : 'desc');
    }
  }

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'rank') cmp = a.rank - b.rank;
    else if (sortKey === 'username') cmp = a.username.localeCompare(b.username);
    else if (sortKey === 'challengesJoined') cmp = a.challengesJoined - b.challengesJoined;
    else if (sortKey === 'level') cmp = a.level - b.level;
    else cmp = a.xp - b.xp;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const filtersActive = titleFilter !== 'all' || sortKey !== 'rank' || sortDir !== 'asc';

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                period === p.value ? 'bg-[#1B2B4B] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

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
            {filtersActive && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#F5B800]" />
            )}
          </button>

          {filtersOpen && (
            <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-4 shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold tracking-wide text-gray-500">FILTERS</p>
                <button
                  onClick={() => {
                    setSortKey('rank');
                    setSortDir('asc');
                    setTitleFilter('all');
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
                  <span className="text-[11px] font-bold text-gray-500">Title</span>
                  <select className={panelSelectClass} value={titleFilter} onChange={(e) => setTitleFilter(e.target.value)}>
                    <option value="all">All titles</option>
                    {LEVEL_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name…"
        className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black outline-none focus:border-[#1B2B4B]"
      />

      {!entries ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[8%]" />
            <col className="w-[24%]" />
            <col className="w-[10%]" />
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[24%]" />
          </colgroup>
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500">
              <th className="rounded-l-lg px-3 py-2">Rank</th>
              {COLUMNS.slice(0, 2).map((col) => (
                <th key={col.key} className="px-3 py-2">
                  <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-[#1B2B4B]">
                    {col.label}
                    {sortKey === col.key && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2">Title</th>
              {COLUMNS.slice(2).map((col, i, arr) => (
                <th key={col.key} className={`px-3 py-2 ${i === arr.length - 1 ? 'rounded-r-lg' : ''}`}>
                  <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-[#1B2B4B]">
                    {col.label}
                    {sortKey === col.key && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => (
              <tr key={e.id} className="border-b border-gray-50">
                <td className={`px-3 py-3 ${e.rank <= 3 ? 'font-extrabold text-[#0D1829]' : 'text-gray-600'}`}>
                  {e.rank}
                </td>
                <td className="px-3 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: avatarColorFor(e.username) }}
                    >
                      {e.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate font-bold text-[#0D1829]">{e.username}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-gray-600">{e.level}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${TITLE_STYLES[e.levelTitle]}`}>
                    {e.levelTitle}
                  </span>
                </td>
                <td className="px-3 py-3 text-gray-600">{e.xp.toLocaleString()}</td>
                <td className="px-3 py-3 text-gray-600">{e.challengesJoined}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
