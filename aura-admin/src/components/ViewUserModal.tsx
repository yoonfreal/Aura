'use client';

import { useEffect, useState } from 'react';
import { fetchFlagHistory, xpForLevel, type AdminUser, type FlagHistoryEntry } from '@/lib/users';
import { avatarColorFor, TITLE_STYLES } from '@/lib/userDisplay';
import { MedalIcon } from '@/components/icons';
import {
  fetchUserBadges,
  fetchUserFriends,
  fetchUserPosts,
  fetchUserWeeklyProgress,
  type DailyProgressPoint,
  type EarnedBadge,
  type FriendSummary,
  type UserPost,
} from '@/lib/userProfile';

const FRIENDS_PREVIEW_COUNT = 6;

// Mirrors aura-app's src/lib/posts.ts ACTIVITY_TYPES — used to show the same icon/label a
// Partner post's activity type shows on aura-app's own PostCard.
const ACTIVITY_TYPES: { value: string; label: string; icon: string }[] = [
  { value: 'running', label: 'Running', icon: '🏃' },
  { value: 'gym', label: 'Gym', icon: '🏋️' },
  { value: 'basketball', label: 'Basketball', icon: '🏀' },
  { value: 'badminton', label: 'Badminton', icon: '🏸' },
  { value: 'swimming', label: 'Swimming', icon: '🏊' },
  { value: 'yoga', label: 'Yoga', icon: '🧘' },
  { value: 'cycling', label: 'Cycling', icon: '🚴' },
  { value: 'other', label: 'Other', icon: '⚡' },
];

function formatPartnerDate(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

export function ViewUserModal({
  user,
  onClose,
  onClearFlag,
}: {
  user: AdminUser & { levelTitle: string; active: boolean };
  onClose: () => void;
  onClearFlag: (user: AdminUser) => void;
}) {
  const [friends, setFriends] = useState<FriendSummary[] | null>(null);
  const [badges, setBadges] = useState<EarnedBadge[] | null>(null);
  const [posts, setPosts] = useState<UserPost[] | null>(null);
  const [flagHistory, setFlagHistory] = useState<FlagHistoryEntry[] | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<DailyProgressPoint[] | null>(null);
  const [selectedDay, setSelectedDay] = useState<DailyProgressPoint | null>(null);
  const [detailError, setDetailError] = useState(false);
  const [friendsExpanded, setFriendsExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchUserFriends(user.id),
      fetchUserBadges(user.id),
      fetchUserPosts(user.id),
      fetchFlagHistory(user.id),
      fetchUserWeeklyProgress(user.id),
    ])
      .then(([f, b, p, h, w]) => {
        if (cancelled) return;
        setFriends(f);
        setBadges(b);
        setPosts(p);
        setFlagHistory(h);
        setWeeklyProgress(w);
      })
      .catch(() => {
        if (!cancelled) setDetailError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const xpIntoLevel = Math.max(0, user.xp - xpForLevel(user.level));
  const xpToNext = Math.max(1, xpForLevel(user.level + 1) - xpForLevel(user.level));
  const xpPercent = Math.min(100, Math.round((xpIntoLevel / xpToNext) * 100));
  const earnedBadges = badges?.filter((b) => b.earned) ?? [];

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-[35rem] overflow-y-auto rounded-2xl bg-white p-7 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ backgroundColor: avatarColorFor(user.username) }}
          >
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-extrabold text-[#0D1829]">{user.username}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TITLE_STYLES[user.levelTitle]}`}>
                {user.levelTitle}
              </span>
              <span className="text-xs text-gray-400">Level {user.level}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>
              {xpIntoLevel.toLocaleString()} / {xpToNext.toLocaleString()} XP
            </span>
            <span>Level {user.level + 1}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-[#F5B800]" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-gray-50 py-2">
            <p className="text-sm font-extrabold text-[#0D1829]">{user.xp.toLocaleString()}</p>
            <p className="text-[11px] text-gray-500">XP Total</p>
          </div>
          <div className="rounded-xl bg-gray-50 py-2">
            <p className="text-sm font-extrabold text-[#0D1829]">{user.streak}</p>
            <p className="text-[11px] text-gray-500">Streak</p>
          </div>
          <div className="rounded-xl bg-gray-50 py-2">
            <p className="text-sm font-extrabold text-[#0D1829]">{badges ? earnedBadges.length : '—'}</p>
            <p className="text-[11px] text-gray-500">Badges</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-xs font-bold tracking-wide text-gray-500">WEEKLY PROGRESS</p>
          <div className="rounded-xl bg-gray-50 p-3">
            {!weeklyProgress ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : (
              <>
                <div className="flex items-end justify-between gap-1.5">
                  {weeklyProgress.map((d) => {
                    const maxSteps = Math.max(...weeklyProgress.map((p) => p.steps), 1);
                    const isMax = d.steps === maxSteps && d.steps > 0;
                    const isSelected = selectedDay?.date === d.date;
                    // Square-root scale, not linear — a lone outlier day (the kind that gets an
                    // account flagged in the first place) would otherwise flatten every other
                    // bar to nearly nothing under a straight ratio.
                    const barHeight = Math.max(4, Math.round((Math.sqrt(d.steps) / Math.sqrt(maxSteps)) * 80));
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => setSelectedDay((prev) => (prev?.date === d.date ? null : d))}
                        className="flex flex-1 flex-col items-center gap-1"
                      >
                        <div
                          className="w-full max-w-[18px] rounded-t-md"
                          style={{ height: `${barHeight}px`, backgroundColor: isSelected ? '#F5B800' : isMax ? '#1B2B4B' : '#B8CCE4' }}
                        />
                        <span className={`text-[10px] ${isSelected ? 'font-extrabold text-[#0D1829]' : 'text-gray-400'}`}>
                          {d.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedDay && (
                  <div className="mt-3 grid gap-1.5 rounded-lg bg-white p-2.5">
                    <p className="text-xs font-extrabold text-[#0D1829]">
                      {selectedDay.label} ·{' '}
                      {new Date(`${selectedDay.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Steps</span>
                      <span className="font-bold text-[#0D1829]">{selectedDay.steps.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Calories burned</span>
                      <span className="font-bold text-[#0D1829]">{selectedDay.calories.toLocaleString()} cal</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">XP earned</span>
                      <span className="font-bold text-[#0D1829]">{selectedDay.xpEarned} XP</span>
                    </div>
                  </div>
                )}

                <div className="mt-3 grid gap-1.5 border-t border-gray-100 pt-3">
                  {[
                    { label: 'XP earned', value: `${weeklyProgress.reduce((s, d) => s + d.xpEarned, 0).toLocaleString()} XP` },
                    {
                      label: 'Calories burned',
                      value: `${weeklyProgress.reduce((s, d) => s + d.calories, 0).toLocaleString()} cal`,
                    },
                    { label: 'Steps count', value: weeklyProgress.reduce((s, d) => s + d.steps, 0).toLocaleString() },
                    {
                      label: 'Distance',
                      value: `${(weeklyProgress.reduce((s, d) => s + d.steps, 0) * 0.000762).toFixed(1)} km`,
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{row.label}</span>
                      <span className="font-bold text-[#0D1829]">{row.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {user.flagged && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-xl bg-amber-50 p-3">
            <div>
              <p className="text-xs font-bold text-amber-700">🚩 Flagged for review</p>
              <p className="mt-0.5 text-xs text-amber-700/80">{user.flagReason ?? 'Unusual activity detected.'}</p>
            </div>
            <button
              onClick={() => onClearFlag(user)}
              className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-amber-700 shadow-sm hover:bg-amber-700 hover:text-white"
            >
              Clear Flag
            </button>
          </div>
        )}

        <div className="mb-6 grid gap-2 text-sm">
          <div className="flex justify-between border-b border-gray-50 py-1.5">
            <span className="text-gray-500">Status</span>
            <span className="font-bold text-[#0D1829]">
              {user.suspended ? 'Suspended' : user.active ? 'Active' : 'Offline'}
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-gray-500">Joined</span>
            <span className="font-bold text-[#0D1829]">{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {detailError && <p className="mb-6 text-xs text-red-600">Could not load friends, badges, or posts.</p>}

        {(user.flagged || (flagHistory && flagHistory.length > 0)) && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-bold tracking-wide text-gray-500">FLAG HISTORY</p>
            {!flagHistory ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : flagHistory.length === 0 ? (
              <p className="text-xs text-gray-400">No past flags.</p>
            ) : (
              <div className="grid gap-2">
                {flagHistory.map((h) => (
                  <div key={h.id} className="rounded-xl bg-gray-50 px-3 py-2 text-xs">
                    <p className="font-bold text-[#0D1829]">{h.reason}</p>
                    <p className="mt-0.5 text-gray-500">
                      Flagged {new Date(h.flaggedAt).toLocaleDateString()}
                      {h.clearedAt
                        ? ` · Cleared ${new Date(h.clearedAt).toLocaleDateString()}${h.clearedByUsername ? ` by ${h.clearedByUsername}` : ''}`
                        : ' · Still open'}
                    </p>
                    {h.adminNote && <p className="mt-0.5 italic text-gray-400">"{h.adminNote}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <p className="mb-2 flex items-center justify-between text-xs font-bold tracking-wide text-gray-500">
            <span className="flex items-center gap-1.5">
              <span>FRIENDS</span>
              {friends && <span>{friends.length}</span>}
            </span>
            {friends && friends.length > FRIENDS_PREVIEW_COUNT && (
              <button
                onClick={() => setFriendsExpanded((v) => !v)}
                className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold normal-case tracking-normal text-[#1B2B4B] shadow-sm hover:bg-[#1B2B4B] hover:text-white"
              >
                {friendsExpanded ? 'Show less' : `Show more (${friends.length - FRIENDS_PREVIEW_COUNT})`}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform ${friendsExpanded ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}
          </p>
          <div className="rounded-xl bg-gray-50 p-3">
            {!friends ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : friends.length === 0 ? (
              <p className="text-xs text-gray-400">No friends yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(friendsExpanded ? friends : friends.slice(0, FRIENDS_PREVIEW_COUNT)).map((f) => (
                  <span key={f.id} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-600">
                    {f.username}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-xs font-bold tracking-wide text-gray-500">BADGE COLLECTION</p>
          <div className="rounded-xl bg-gray-50 p-3">
            {!badges ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : earnedBadges.length === 0 ? (
              <p className="text-xs text-gray-400">No badges earned yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {earnedBadges.map((b) => (
                  <span
                    key={b.label}
                    className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700"
                  >
                    <MedalIcon />
                    {b.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-xs font-bold tracking-wide text-gray-500">POSTS</p>
          {!posts ? (
            <p className="text-xs text-gray-400">Loading…</p>
          ) : posts.length === 0 ? (
            <p className="text-xs text-gray-400">No posts yet.</p>
          ) : (
            <div className="grid gap-3">
              {posts.map((p) => (
                <div key={p.id} className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</p>

                  {p.caption && <p className="mt-1.5 text-xs text-[#0D1829]">{p.caption}</p>}

                  {p.achievementTitle && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1">
                      <span className="text-xs">{p.achievementIcon ?? '🏆'}</span>
                      <span className="text-xs font-bold text-amber-700">{p.achievementTitle}</span>
                      {p.achievementXp != null && <span className="text-[11px] font-bold text-amber-700/80">+{p.achievementXp} XP</span>}
                    </div>
                  )}

                  {p.type === 'partner' && (
                    <div className="mt-2 grid gap-1 rounded-lg bg-white p-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                        <span>{ACTIVITY_TYPES.find((a) => a.value === p.activityType)?.icon ?? '⚡'}</span>
                        <span>{ACTIVITY_TYPES.find((a) => a.value === p.activityType)?.label ?? p.activityType}</span>
                      </div>
                      {p.activityAt && <p className="text-[11px] text-gray-500">{formatPartnerDate(p.activityAt)}</p>}
                      {p.location && <p className="text-[11px] text-gray-500">{p.location}</p>}
                      <p className="text-[11px] text-gray-500">
                        {p.peopleNeeded != null ? `Looking for ${p.peopleNeeded} people` : 'Open to anyone'}
                      </p>
                    </div>
                  )}

                  {p.challengeTitle && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#EBF2FF] px-2.5 py-1">
                      <span className="text-xs">{p.challengeIcon ?? '🏆'}</span>
                      <span className="text-xs font-bold text-[#1B2B4B]">Linked: {p.challengeTitle}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={onClose} className="w-full rounded-xl bg-[#1B2B4B] py-2 text-sm font-extrabold text-white">
          Close
        </button>
      </div>
    </div>
  );
}
