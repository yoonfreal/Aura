'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchFlaggedUsers, getLevelTitle, isUserActive, type AdminUser } from '@/lib/users';
import { useAuth } from '@/lib/AuthProvider';
import { ViewUserModal } from './ViewUserModal';
import { ClearFlagModal } from './ClearFlagModal';

export function SuspiciousActivityPanel() {
  const { user: admin } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);

  useEffect(() => {
    fetchFlaggedUsers()
      .then(setUsers)
      .catch(() => setError('Could not load flagged accounts.'));
  }, []);

  const reviewingUser = users?.find((u) => u.id === reviewingId);
  const reviewingUserWithMeta = reviewingUser
    ? { ...reviewingUser, active: isUserActive(reviewingUser.lastSeenAt), levelTitle: getLevelTitle(reviewingUser.level) }
    : undefined;
  const clearingUser = users?.find((u) => u.id === clearingId);

  return (
    <div className="min-w-0 rounded-2xl bg-white p-5 shadow-sm">
      <p className="mb-4 text-xs font-bold tracking-wide text-gray-500">SUSPICIOUS ACTIVITIES</p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !users && <p className="text-sm text-gray-500">Loading…</p>}
      {!error && users && users.length === 0 && <p className="text-sm text-gray-400">No flagged accounts right now.</p>}

      {users && users.length > 0 && (
        <div className="grid gap-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex min-w-0 items-start justify-between gap-3 rounded-lg border-l-4 border-amber-400 bg-gray-50 py-2.5 pl-3 pr-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#0D1829]">{u.username}</p>
                <p className="mt-0.5 truncate text-xs text-gray-500">{u.flagReason ?? 'Unusual activity detected.'}</p>
              </div>
              <button
                onClick={() => setReviewingId(u.id)}
                className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:border-[#1B2B4B] hover:text-[#1B2B4B]"
              >
                Review
              </button>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/user-management/flag-history"
        className="mt-4 flex items-center justify-end gap-1 text-xs font-bold text-[#1B2B4B] hover:underline"
      >
        View all activity →
      </Link>

      {reviewingUserWithMeta && (
        <ViewUserModal
          key={`view-${reviewingUserWithMeta.id}`}
          user={reviewingUserWithMeta}
          onClose={() => setReviewingId(null)}
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
            setUsers((prev) => prev && prev.filter((u) => u.id !== clearingUser.id));
            setClearingId(null);
            setReviewingId(null);
          }}
        />
      )}
    </div>
  );
}
