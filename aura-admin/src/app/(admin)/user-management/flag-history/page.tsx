'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  fetchAllFlagHistory,
  fetchUserById,
  getLevelTitle,
  isUserActive,
  setUserSuspended,
  type AdminUser,
  type AllFlagHistoryEntry,
} from '@/lib/users';
import { useAuth } from '@/lib/AuthProvider';
import { avatarColorFor } from '@/lib/userDisplay';
import { ViewUserModal } from '@/components/ViewUserModal';
import { ClearFlagModal } from '@/components/ClearFlagModal';

type StatusFilter = 'all' | 'open' | 'cleared';
type SortOption = 'flagged-desc' | 'flagged-asc' | 'username-asc' | 'username-desc' | 'most-flagged';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'flagged-desc', label: 'Newest flagged first' },
  { value: 'flagged-asc', label: 'Oldest flagged first' },
  { value: 'most-flagged', label: 'Most flagged accounts first' },
  { value: 'username-asc', label: 'Username (A–Z)' },
  { value: 'username-desc', label: 'Username (Z–A)' },
];

const panelSelectClass =
  'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-black outline-none focus:border-[#1B2B4B]';

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-bold text-gray-500">{label}</span>
      {children}
    </label>
  );
}

export default function FlagHistoryPage() {
  const { user: admin } = useAuth();
  const [entries, setEntries] = useState<AllFlagHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<(AdminUser & { levelTitle: string; active: boolean }) | null>(null);
  const [clearingUser, setClearingUser] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('flagged-desc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAllFlagHistory()
      .then(setEntries)
      .catch(() => setError('Could not load flag history.'));
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

  async function handleView(userId: string) {
    try {
      const u = await fetchUserById(userId);
      if (!u) return;
      setViewingUser({ ...u, active: isUserActive(u.lastSeenAt), levelTitle: getLevelTitle(u.level) });
    } catch {
      alert('Could not load that account.');
    }
  }

  function handleFlagCleared(userId: string, note: string | null) {
    setEntries(
      (prev) =>
        prev &&
        prev.map((e) =>
          e.userId === userId && !e.clearedAt
            ? { ...e, clearedAt: new Date().toISOString(), clearedByUsername: admin?.username ?? null, adminNote: note }
            : e,
        ),
    );
  }

  async function handleToggleSuspend(entry: AllFlagHistoryEntry) {
    const next = !entry.suspended;
    if (next && !confirm(`Suspend "${entry.username}"? They'll be signed out and blocked from logging back in until unsuspended.`)) {
      return;
    }
    try {
      await setUserSuspended(entry.userId, next);
      setEntries((prev) => prev && prev.map((e) => (e.userId === entry.userId ? { ...e, suspended: next } : e)));
    } catch {
      alert(`Could not ${next ? 'suspend' : 'unsuspend'} "${entry.username}". Try again.`);
    }
  }

  const flagCountByUser = new Map<string, number>();
  for (const e of entries ?? []) {
    flagCountByUser.set(e.userId, (flagCountByUser.get(e.userId) ?? 0) + 1);
  }

  const filtered = (entries ?? [])
    .filter((e) => e.username.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((e) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'open') return !e.clearedAt;
      return !!e.clearedAt;
    });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortOption) {
      case 'flagged-asc':
        return new Date(a.flaggedAt).getTime() - new Date(b.flaggedAt).getTime();
      case 'username-asc':
        return a.username.localeCompare(b.username);
      case 'username-desc':
        return b.username.localeCompare(a.username);
      case 'most-flagged': {
        const diff = (flagCountByUser.get(b.userId) ?? 0) - (flagCountByUser.get(a.userId) ?? 0);
        return diff !== 0 ? diff : new Date(b.flaggedAt).getTime() - new Date(a.flaggedAt).getTime();
      }
      case 'flagged-desc':
      default:
        return new Date(b.flaggedAt).getTime() - new Date(a.flaggedAt).getTime();
    }
  });

  return (
    <div>
      <Link href="/user-management" className="mb-4 inline-block text-xs font-bold text-gray-500 hover:text-[#1B2B4B]">
        ← Back to User Management
      </Link>
      <h1 className="mb-6 text-xl font-extrabold text-[#0D1829]">Flag History</h1>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold tracking-wide text-gray-500">ALL FLAG EVENTS</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username…"
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
                {(sortOption !== 'flagged-desc' || statusFilter !== 'all') && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#F5B800]" />
                )}
              </button>

              {filtersOpen && (
                <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-4 shadow-md">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold tracking-wide text-gray-500">FILTERS</p>
                    <button
                      onClick={() => {
                        setSortOption('flagged-desc');
                        setStatusFilter('all');
                      }}
                      className="text-xs font-bold text-[#1B2B4B] hover:underline"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="grid gap-4">
                    <FilterField label="Sort by">
                      <select
                        className={panelSelectClass}
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as SortOption)}
                      >
                        {SORT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </FilterField>

                    <FilterField label="Status">
                      <select
                        className={panelSelectClass}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                      >
                        <option value="all">All statuses</option>
                        <option value="open">Open</option>
                        <option value="cleared">Cleared</option>
                      </select>
                    </FilterField>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {!error && !entries && <p className="text-sm text-gray-500">Loading…</p>}
        {!error && entries && entries.length === 0 && <p className="text-sm text-gray-400">No accounts have been flagged yet.</p>}
        {!error && entries && entries.length > 0 && sorted.length === 0 && (
          <p className="text-sm text-gray-400">No flag events match your search/filter.</p>
        )}

        {sorted.length > 0 && (
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[32%]" />
              <col className="w-[11%]" />
              <col className="w-[9%]" />
              <col className="w-[13%]" />
              <col className="w-[19%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500">
                <th className="rounded-l-lg px-3 py-2">Username</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Flagged</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Cleared</th>
                <th className="rounded-r-lg px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id} className="border-b border-gray-50">
                  <td className="px-3 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: avatarColorFor(e.username) }}
                      >
                        {e.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="group relative min-w-0">
                        <span className="block truncate font-bold text-[#0D1829]">{e.username}</span>
                        <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden whitespace-nowrap rounded-md bg-[#1B2B4B] px-2 py-1 text-xs font-bold text-white shadow-lg group-hover:block">
                          {e.username}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="line-clamp-2 text-gray-600">{e.reason}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-500">{new Date(e.flaggedAt).toLocaleDateString()}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        e.clearedAt ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {e.clearedAt ? 'Cleared' : 'Open'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {e.clearedAt ? (
                      <>
                        {new Date(e.clearedAt).toLocaleDateString()}
                        {e.clearedByUsername && <span className="block text-[11px] text-gray-400">by {e.clearedByUsername}</span>}
                        {e.adminNote && <span className="mt-0.5 block truncate text-[11px] italic text-gray-400">"{e.adminNote}"</span>}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleView(e.userId)}
                        className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 px-2.5 text-xs font-bold text-gray-500 hover:border-[#1B2B4B] hover:text-[#1B2B4B]"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleToggleSuspend(e)}
                        className={`flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-xs font-bold ${
                          e.suspended
                            ? 'border-gray-200 text-green-700 hover:border-green-600'
                            : 'border-gray-200 text-red-600 hover:border-red-600'
                        }`}
                      >
                        {e.suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewingUser && (
        <ViewUserModal
          key={`view-${viewingUser.id}`}
          user={viewingUser}
          onClose={() => setViewingUser(null)}
          onClearFlag={(u) => setClearingUser(u)}
        />
      )}

      {clearingUser && (
        <ClearFlagModal
          key={`clear-${clearingUser.id}`}
          user={clearingUser}
          adminId={admin?.id ?? null}
          adminUsername={admin?.username ?? null}
          onClose={() => setClearingUser(null)}
          onCleared={({ note }) => {
            handleFlagCleared(clearingUser.id, note);
            setClearingUser(null);
            setViewingUser(null);
          }}
        />
      )}
    </div>
  );
}
