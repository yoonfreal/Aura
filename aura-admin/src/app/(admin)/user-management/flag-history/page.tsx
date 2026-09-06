'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
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

type UserFlagGroup = {
  userId: string;
  username: string;
  suspended: boolean;
  totalFlags: number;
  openFlags: number;
  mostRecentReason: string;
  mostRecentFlaggedAt: string;
  mostRecentClearedAt: string | null;
  mostRecentClearedByUsername: string | null;
  mostRecentAdminNote: string | null;
};

// entries arrive newest-flagged-first (see fetchAllFlagHistory), so the first entry seen
// for a given user is that user's most recent flag/clear cycle.
function groupByUser(entries: AllFlagHistoryEntry[]): UserFlagGroup[] {
  const groups = new Map<string, UserFlagGroup>();
  for (const e of entries) {
    const existing = groups.get(e.userId);
    if (!existing) {
      groups.set(e.userId, {
        userId: e.userId,
        username: e.username,
        suspended: e.suspended,
        totalFlags: 1,
        openFlags: e.clearedAt ? 0 : 1,
        mostRecentReason: e.reason,
        mostRecentFlaggedAt: e.flaggedAt,
        mostRecentClearedAt: e.clearedAt,
        mostRecentClearedByUsername: e.clearedByUsername,
        mostRecentAdminNote: e.adminNote,
      });
    } else {
      existing.totalFlags += 1;
      if (!e.clearedAt) existing.openFlags += 1;
    }
  }
  return [...groups.values()];
}

type FlagSeverity = 'low' | 'medium' | 'high';

// 1-3 lifetime flags is common enough (a single bad-data day) not to warrant escalation;
// 4-9 marks a repeat pattern worth a closer look; 10+ is a chronic offender.
function severityFor(totalFlags: number): FlagSeverity {
  if (totalFlags >= 10) return 'high';
  if (totalFlags >= 4) return 'medium';
  return 'low';
}

const SEVERITY_STYLES: Record<FlagSeverity, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

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
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
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

  function toggleExpanded(userId: string) {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  // The per-row Clear button only needs id/username/flagReason to drive ClearFlagModal —
  // building it from the flag row avoids a fetchUserById round trip just to open the modal.
  function handleClearEntry(entry: AllFlagHistoryEntry) {
    setClearingUser({
      id: entry.userId,
      username: entry.username,
      level: 1,
      xp: 0,
      streak: 0,
      lastSeenAt: null,
      createdAt: '',
      suspended: entry.suspended,
      flagged: true,
      flagReason: entry.reason,
    });
  }

  async function handleToggleSuspend(group: UserFlagGroup) {
    const next = !group.suspended;
    if (next && !confirm(`Suspend "${group.username}"? They'll be signed out and blocked from logging back in until unsuspended.`)) {
      return;
    }
    try {
      await setUserSuspended(group.userId, next, admin?.id ?? '', admin?.username ?? 'Admin');
      setEntries((prev) => prev && prev.map((e) => (e.userId === group.userId ? { ...e, suspended: next } : e)));
    } catch {
      alert(`Could not ${next ? 'suspend' : 'unsuspend'} "${group.username}". Try again.`);
    }
  }

  const userGroups = groupByUser(entries ?? []);

  const filtered = userGroups
    .filter((g) => g.username.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((g) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'open') return g.openFlags > 0;
      return g.openFlags === 0;
    });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortOption) {
      case 'flagged-asc':
        return new Date(a.mostRecentFlaggedAt).getTime() - new Date(b.mostRecentFlaggedAt).getTime();
      case 'username-asc':
        return a.username.localeCompare(b.username);
      case 'username-desc':
        return b.username.localeCompare(a.username);
      case 'most-flagged': {
        const diff = b.totalFlags - a.totalFlags;
        return diff !== 0 ? diff : new Date(b.mostRecentFlaggedAt).getTime() - new Date(a.mostRecentFlaggedAt).getTime();
      }
      case 'flagged-desc':
      default:
        return new Date(b.mostRecentFlaggedAt).getTime() - new Date(a.mostRecentFlaggedAt).getTime();
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
          <p className="text-xs font-bold tracking-wide text-gray-500">FLAGGED ACCOUNTS</p>
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
                        <option value="open">Pending</option>
                        <option value="cleared">Resolved</option>
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
          <p className="text-sm text-gray-400">No accounts match your search/filter.</p>
        )}

        {sorted.length > 0 && (
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[28%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[21%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500">
                <th className="rounded-l-lg px-3 py-2">Username</th>
                <th className="px-3 py-2">Most recent reason</th>
                <th className="px-3 py-2">Flags</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Last flagged</th>
                <th className="rounded-r-lg px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((g) => {
                const isExpanded = expandedUsers.has(g.userId);
                const userEntries = (entries ?? []).filter((e) => e.userId === g.userId);
                const mostRecentEntry = userEntries[0];
                // Skip the most recent entry when listing sub-rows — it's already shown in
                // this row's "Most recent reason" column, so repeating it below would duplicate it.
                const olderEntries = userEntries.slice(1);
                const hasHistory = olderEntries.length > 0;
                return (
                  <Fragment key={g.userId}>
                    <tr
                      onClick={hasHistory ? () => toggleExpanded(g.userId) : undefined}
                      className={`border-b border-gray-50 ${hasHistory ? 'cursor-pointer hover:bg-gray-50/60' : ''}`}
                    >
                      <td className="px-3 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          {hasHistory ? (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={`shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          ) : (
                            <span className="w-[10px] shrink-0" />
                          )}
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: avatarColorFor(g.username) }}
                          >
                            {g.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="group relative min-w-0">
                            <span className="block truncate font-bold text-[#0D1829]">{g.username}</span>
                            <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden whitespace-nowrap rounded-md bg-[#1B2B4B] px-2 py-1 text-xs font-bold text-white shadow-lg group-hover:block">
                              {g.username}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="line-clamp-2 text-gray-600">{g.mostRecentReason}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${SEVERITY_STYLES[severityFor(g.totalFlags)]}`}
                        >
                          {g.totalFlags} {g.totalFlags === 1 ? 'flag' : 'flags'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            g.openFlags > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {g.openFlags > 0 ? 'Pending' : 'Resolved'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-500">{new Date(g.mostRecentFlaggedAt).toLocaleDateString()}</td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-nowrap items-center gap-1.5">
                          <button
                            onClick={() => handleView(g.userId)}
                            className="flex h-8 items-center whitespace-nowrap rounded-lg border border-gray-200 px-2 text-xs font-bold text-gray-500 hover:border-[#1B2B4B] hover:text-[#1B2B4B]"
                          >
                            Profile
                          </button>
                          <button
                            onClick={() => handleToggleSuspend(g)}
                            className={`flex h-8 items-center whitespace-nowrap rounded-lg border px-2 text-xs font-bold ${
                              g.suspended
                                ? 'border-gray-200 text-green-700 hover:border-green-600'
                                : 'border-gray-200 text-red-600 hover:border-red-600'
                            }`}
                          >
                            {g.suspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                          {g.openFlags > 0 && (
                            <button
                              onClick={() => handleClearEntry(mostRecentEntry)}
                              className="flex h-8 items-center whitespace-nowrap rounded-lg border border-gray-200 px-2 text-xs font-bold text-gray-500 hover:border-[#1B2B4B] hover:text-[#1B2B4B]"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded &&
                      olderEntries.map((e, i) => (
                        <tr key={e.id} className="border-b border-gray-50 bg-gray-50/40">
                          <td className="relative px-3 py-2.5">
                            <div
                              className="absolute left-[19px] top-0 w-px bg-gray-200"
                              style={{ bottom: i === olderEntries.length - 1 ? '50%' : '0' }}
                            />
                            <div className="absolute left-[19px] top-1/2 h-px w-3 -translate-y-1/2 bg-gray-200" />
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="text-xs font-bold text-[#0D1829]">{e.reason}</p>
                            <p className="mt-0.5 text-[11px] text-gray-500">
                              {e.clearedAt
                                ? `Resolved ${new Date(e.clearedAt).toLocaleDateString()}${e.clearedByUsername ? ` by ${e.clearedByUsername}` : ''}`
                                : 'Still pending'}
                            </p>
                            {e.adminNote && <p className="mt-0.5 text-[11px] italic text-gray-400">&quot;{e.adminNote}&quot;</p>}
                          </td>
                          <td className="px-3 py-2.5"></td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                e.clearedAt ? 'bg-gray-200 text-gray-500' : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {e.clearedAt ? 'Resolved' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-400">{new Date(e.flaggedAt).toLocaleDateString()}</td>
                          <td className="px-3 py-2.5">
                            {!e.clearedAt && (
                              <button
                                onClick={() => handleClearEntry(e)}
                                className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 px-2.5 text-xs font-bold text-gray-500 hover:border-[#1B2B4B] hover:text-[#1B2B4B]"
                              >
                                Resolve
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
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
