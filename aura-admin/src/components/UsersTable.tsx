'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchAllUsers, getLevelTitle, isUserActive, setUserSuspended, type AdminUser } from '@/lib/users';
import { avatarColorFor, TITLE_STYLES } from '@/lib/userDisplay';
import { useAuth } from '@/lib/AuthProvider';
import { ViewUserModal } from './ViewUserModal';
import { ClearFlagModal } from './ClearFlagModal';

type SortKey = 'username' | 'level' | 'title' | 'xp' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'username', label: 'Username' },
  { key: 'level', label: 'Level' },
  { key: 'title', label: 'Title' },
  { key: 'xp', label: 'XP' },
  { key: 'status', label: 'Status' },
];

const SORT_OPTIONS: { value: string; label: string; key: SortKey; dir: SortDir }[] = [
  { value: 'name-asc', label: 'Name (A–Z)', key: 'username', dir: 'asc' },
  { value: 'name-desc', label: 'Name (Z–A)', key: 'username', dir: 'desc' },
  { value: 'created-desc', label: 'Newest accounts', key: 'createdAt', dir: 'desc' },
  { value: 'created-asc', label: 'Oldest accounts', key: 'createdAt', dir: 'asc' },
];

const LEVEL_TIERS = ['Beginner', 'Rookie', 'Warrior', 'Athlete', 'Elite', 'Legend'];

const panelSelectClass =
  'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-black outline-none focus:border-[#1B2B4B]';

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-bold text-gray-500">{label}</span>
      {children}
    </label>
  );
}

export function UsersTable() {
  const { user: admin } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('username');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllUsers()
      .then(setUsers)
      .catch(() => setError('Could not load users.'));
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

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!users) return <p className="text-sm text-gray-500">Loading…</p>;

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  async function handleToggleSuspend(user: AdminUser) {
    const next = !user.suspended;
    if (next && !confirm(`Suspend "${user.username}"? They'll be signed out and blocked from logging back in until unsuspended.`)) {
      return;
    }
    try {
      await setUserSuspended(user.id, next);
      setUsers((prev) => prev && prev.map((u) => (u.id === user.id ? { ...u, suspended: next } : u)));
    } catch {
      alert(`Could not ${next ? 'suspend' : 'unsuspend'} "${user.username}". Try again.`);
    }
  }

  const rows = users
    .map((u) => ({ ...u, active: isUserActive(u.lastSeenAt), levelTitle: getLevelTitle(u.level) }))
    .filter((u) => u.username.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((u) => levelFilter === 'all' || u.levelTitle === levelFilter)
    .filter((u) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'flagged') return u.flagged;
      if (statusFilter === 'suspended') return u.suspended;
      if (statusFilter === 'active') return !u.suspended && u.active;
      return !u.suspended && !u.active;
    });

  const viewingUser = viewingId ? rows.find((u) => u.id === viewingId) : undefined;
  const clearingUser = clearingId ? users.find((u) => u.id === clearingId) : undefined;

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'username') cmp = a.username.localeCompare(b.username);
    else if (sortKey === 'level' || sortKey === 'title') cmp = a.level - b.level;
    else if (sortKey === 'xp') cmp = a.xp - b.xp;
    else if (sortKey === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    else cmp = Number(a.active) - Number(b.active);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-wide text-gray-500">ALL USERS</p>
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
              {(sortKey !== 'username' || sortDir !== 'asc' || levelFilter !== 'all' || statusFilter !== 'all') && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#F5B800]" />
              )}
            </button>

            {filtersOpen && (
              <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded-2xl border border-gray-100 bg-white p-4 shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold tracking-wide text-gray-500">FILTERS</p>
                  <button
                    onClick={() => {
                      setSortKey('username');
                      setSortDir('asc');
                      setLevelFilter('all');
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
                  </FilterField>

                  <FilterField label="Level">
                    <select className={panelSelectClass} value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                      <option value="all">All levels</option>
                      {LEVEL_TIERS.map((tier) => (
                        <option key={tier} value={tier}>
                          {tier}
                        </option>
                      ))}
                    </select>
                  </FilterField>

                  <FilterField label="Status">
                    <select className={panelSelectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="all">All statuses</option>
                      <option value="active">Active</option>
                      <option value="offline">Offline</option>
                      <option value="suspended">Suspended</option>
                      <option value="flagged">Flagged</option>
                    </select>
                  </FilterField>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[24%]" />
          <col className="w-[8%]" />
          <col className="w-[14%]" />
          <col className="w-[12%]" />
          <col className="w-[14%]" />
          <col className="w-[28%]" />
        </colgroup>
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500">
            {COLUMNS.map((col) =>
              col.key === 'username' ? (
                <th key={col.key} className="rounded-l-lg px-3 py-2">
                  {col.label}
                </th>
              ) : (
                <th key={col.key} className="px-3 py-2">
                  <button
                    onClick={() => handleSort(col.key)}
                    className="flex items-center gap-1 hover:text-[#1B2B4B]"
                  >
                    {col.label}
                    {sortKey === col.key && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
              ),
            )}
            <th className="rounded-r-lg px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((u) => (
            <tr key={u.id} className="border-b border-gray-50">
              <td className="px-3 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: avatarColorFor(u.username) }}
                  >
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="group relative min-w-0">
                    <span className="block truncate font-bold text-[#0D1829]">{u.username}</span>
                    <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden whitespace-nowrap rounded-md bg-[#1B2B4B] px-2 py-1 text-xs font-bold text-white shadow-lg group-hover:block">
                      {u.username}
                    </span>
                  </span>
                </div>
              </td>
              <td className="px-3 py-3 text-gray-600">{u.level}</td>
              <td className="px-3 py-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${TITLE_STYLES[u.levelTitle]}`}>
                  {u.levelTitle}
                </span>
              </td>
              <td className="px-3 py-3 text-gray-600">{u.xp.toLocaleString()}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      u.suspended
                        ? 'bg-red-100 text-red-700'
                        : u.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {u.suspended ? 'Suspended' : u.active ? 'Active' : 'Offline'}
                  </span>
                  {u.flagged && (
                    <span
                      title={u.flagReason ?? 'Flagged for unusual activity'}
                      className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700"
                    >
                      Flagged
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setViewingId(u.id)}
                    className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 px-2.5 text-xs font-bold text-gray-500 hover:border-[#1B2B4B] hover:text-[#1B2B4B]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    View
                  </button>
                  <button
                    onClick={() => handleToggleSuspend(u)}
                    className={`flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-xs font-bold ${
                      u.suspended
                        ? 'border-gray-200 text-green-700 hover:border-green-600'
                        : 'border-gray-200 text-red-600 hover:border-red-600'
                    }`}
                  >
                    {u.suspended ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </svg>
                    )}
                    {u.suspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                  {u.flagged && (
                    <button
                      onClick={() => setClearingId(u.id)}
                      title={u.flagReason ?? undefined}
                      className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 px-2.5 text-xs font-bold text-amber-700 hover:border-amber-600"
                    >
                      🚩 Clear Flag
                    </button>
                  )}
                </div>
              </td>
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

      {viewingUser && (
        <ViewUserModal
          key={`view-${viewingUser.id}`}
          user={viewingUser}
          onClose={() => setViewingId(null)}
          onClearFlag={(u) => setClearingId(u.id)}
        />
      )}

      {clearingUser && (
        <ClearFlagModal
          key={`clear-${clearingUser.id}`}
          user={clearingUser}
          adminId={admin?.id ?? null}
          adminUsername={admin?.username ?? null}
          onClose={() => setClearingId(null)}
          onCleared={() => {
            setUsers((prev) => prev && prev.map((u) => (u.id === clearingUser.id ? { ...u, flagged: false, flagReason: null } : u)));
            setClearingId(null);
            setViewingId(null);
          }}
        />
      )}
    </div>
  );
}
