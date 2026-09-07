'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { fetchAppSettings, updateAppSettings, type AppSettings } from '@/lib/settings';
import { sendAnnouncement } from '@/lib/notifications';
import { fetchRecentActivity, type ActivityLogEntry } from '@/lib/activityLog';
import { searchUsersByUsername, setUserRole, type ManagedUser } from '@/lib/adminManagement';
import { fetchCurrentEmail, updateEmail, updatePassword } from '@/lib/account';
import { fetchBannedWords, addBannedWord, removeBannedWord, type BannedWord } from '@/lib/bannedWords';

function extractErrorMessage(err: unknown): string {
  const e = err as { message?: string } | null;
  return e?.message ?? 'Please try again.';
}

function ToggleSwitch({
  checked,
  onChange,
  activeColor = '#1F6D46',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  activeColor?: string;
}) {
  return (
    <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="absolute inset-0 rounded-full transition-colors" style={{ backgroundColor: checked ? activeColor : '#D1D5DB' }} />
      <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
    </label>
  );
}

function ModerationCard({
  settings,
  onSaved,
}: {
  settings: AppSettings;
  onSaved: (next: AppSettings) => void;
}) {
  const { user: admin } = useAuth();
  // settings only changes to a value draft doesn't already match right after a successful
  // save (see onSaved below) or before this card has mounted at all (the parent only
  // renders it once settings has loaded), so a plain initial state covers both cases without
  // an effect to keep them in sync.
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const dirty =
    draft.communityPostsEnabled !== settings.communityPostsEnabled ||
    draft.partnerFinderEnabled !== settings.partnerFinderEnabled ||
    draft.filterBannedKeywords !== settings.filterBannedKeywords ||
    draft.maintenanceModeEnabled !== settings.maintenanceModeEnabled;

  async function handleSave() {
    // Maintenance mode locks every user out of the whole app, not just one feature — worth a
    // confirmation the other toggles here don't need, same reasoning as confirming a suspend.
    if (draft.maintenanceModeEnabled && !settings.maintenanceModeEnabled) {
      if (!confirm('Turn on maintenance mode? Every user will be locked out of the app until you turn this back off.')) {
        return;
      }
    }

    setSaving(true);
    setError(null);
    setJustSaved(false);
    try {
      await updateAppSettings(admin?.id ?? '', admin?.username ?? 'Admin', settings, draft);
      onSaved(draft);
      setJustSaved(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col rounded-2xl bg-white p-5 shadow-sm">
      <p className="mb-4 text-xs font-bold tracking-wide text-gray-500">MODERATION</p>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#0D1829]">Community posts</p>
          <p className="text-xs text-gray-500">Master switch — turns off all posts &amp; replies, partner included</p>
        </div>
        <ToggleSwitch checked={draft.communityPostsEnabled} onChange={(v) => setDraft((d) => ({ ...d, communityPostsEnabled: v }))} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#0D1829]">Partner finder posts</p>
          <p className="text-xs text-gray-500">Allow find-partner listings (only while Community posts is on)</p>
        </div>
        <ToggleSwitch checked={draft.partnerFinderEnabled} onChange={(v) => setDraft((d) => ({ ...d, partnerFinderEnabled: v }))} />
      </div>

      <label className="mt-5 flex items-center gap-2">
        <input
          type="checkbox"
          checked={draft.filterBannedKeywords}
          onChange={(e) => setDraft((d) => ({ ...d, filterBannedKeywords: e.target.checked }))}
          className="h-4 w-4 accent-[#1F6D46]"
        />
        <span className="text-sm font-bold text-gray-700">Filter banned keywords</span>
      </label>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
        <div>
          <p className="text-sm font-bold text-red-700">Maintenance mode</p>
          <p className="text-xs text-red-600/80">Locks every user out of the app until turned off</p>
        </div>
        <ToggleSwitch
          checked={draft.maintenanceModeEnabled}
          onChange={(v) => setDraft((d) => ({ ...d, maintenanceModeEnabled: v }))}
          activeColor="#DC2626"
        />
      </div>

      <BannedWordsSection />

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      {justSaved && !dirty && <p className="mt-3 text-xs font-bold text-emerald-600">Saved.</p>}

      <div className="mt-auto flex justify-end gap-2 pt-5">
        <button
          type="button"
          onClick={() => setDraft(settings)}
          disabled={!dirty || saving}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="rounded-xl bg-[#1B2B4B] px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// Each add/remove is its own immediate action against the banned_keywords table — unlike the
// toggles above, there's no draft/Save step, since there's no ambiguity about "did I mean to
// add this word" the way there can be for a toggle someone might flip back and forth.
function BannedWordsSection() {
  const { user: admin } = useAuth();
  const [words, setWords] = useState<BannedWord[] | null>(null);
  const [newWord, setNewWord] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetchBannedWords()
      .then(setWords)
      .catch(() => setWords(null));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newWord.trim().toLowerCase();
    if (!trimmed) return;
    setAdding(true);
    setError(null);
    try {
      await addBannedWord(trimmed, admin?.id ?? '', admin?.username ?? 'Admin');
      setNewWord('');
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(word: BannedWord) {
    setRemovingId(word.id);
    setError(null);
    try {
      await removeBannedWord(word.id, word.word, admin?.id ?? '', admin?.username ?? 'Admin');
      setWords((prev) => prev && prev.filter((w) => w.id !== word.id));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <p className="mb-2 text-xs font-bold tracking-wide text-gray-500">BANNED WORDS</p>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          placeholder="Add a word…"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-black outline-none focus:border-[#1B2B4B]"
        />
        <button
          type="submit"
          disabled={!newWord.trim() || adding}
          className="rounded-lg bg-[#1B2B4B] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {adding ? '…' : 'Add'}
        </button>
      </form>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {words === null ? (
          <p className="text-xs text-gray-400">Could not load the word list.</p>
        ) : words.length === 0 ? (
          <p className="text-xs text-gray-400">No words in the list.</p>
        ) : (
          words.map((w) => (
            <span key={w.id} className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
              {w.word}
              <button
                type="button"
                onClick={() => handleRemove(w)}
                disabled={removingId === w.id}
                aria-label={`Remove ${w.word}`}
                className="text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function AnnouncementCard({ onSent }: { onSent: () => void }) {
  const { user: admin } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    setConfirmation(null);
    try {
      const count = await sendAnnouncement(admin?.id ?? '', admin?.username ?? 'Admin', trimmed);
      setMessage('');
      setConfirmation(`Sent to ${count.toLocaleString()} user${count === 1 ? '' : 's'}.`);
      onSent();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col rounded-2xl bg-white p-5 shadow-sm">
      <p className="mb-4 text-xs font-bold tracking-wide text-gray-500">ANNOUNCEMENTS</p>
      <p className="mb-3 text-xs text-gray-500">Send a message to every user&rsquo;s notification feed.</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="e.g. App will be down tonight 11pm–1am for maintenance."
        rows={5}
        className="w-full flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-black outline-none focus:border-[#1B2B4B]"
      />

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      {confirmation && <p className="mt-3 text-xs font-bold text-emerald-600">{confirmation}</p>}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="rounded-xl bg-[#F5B800] px-4 py-2 text-sm font-extrabold text-[#1B2B4B] disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send to everyone'}
        </button>
      </div>
    </div>
  );
}

function AdminManagementCard({ onChanged }: { onChanged: () => void }) {
  const { user: admin } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ManagedUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clears any pending debounced search if the card unmounts mid-wait.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Live, debounced search — waits 300ms after the last keystroke before querying, so typing
  // "yoonhsu" doesn't fire a request per letter, but there's no separate Search button to click.
  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (!trimmed) {
      setResults(null);
      setError(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => {
      searchUsersByUsername(trimmed)
        .then((users) => {
          setResults(users);
          setError(null);
        })
        .catch((err) => setError(extractErrorMessage(err)))
        .finally(() => setSearching(false));
    }, 300);
  }

  async function handleToggleRole(user: ManagedUser) {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMessage =
      nextRole === 'admin'
        ? `Grant admin access to "${user.username}"? They'll be able to sign in to this admin dashboard.`
        : `Remove admin access from "${user.username}"?`;
    if (!confirm(confirmMessage)) return;

    setPendingId(user.id);
    setError(null);
    try {
      await setUserRole(user.id, user.username, nextRole, admin?.id ?? '', admin?.username ?? 'Admin');
      setResults((prev) => prev && prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)));
      onChanged();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col rounded-2xl bg-white p-5 shadow-sm">
      <p className="mb-4 text-xs font-bold tracking-wide text-gray-500">ADMIN MANAGEMENT</p>
      <input
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="Search by username…"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black outline-none focus:border-[#1B2B4B]"
      />

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-4 flex-1">
        {results === null ? (
          <p className="text-xs text-gray-400">
            {searching ? 'Searching…' : 'Search for a user to grant or remove admin access.'}
          </p>
        ) : results.length === 0 ? (
          <p className="text-xs text-gray-400">No users match &ldquo;{query}&rdquo;.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {results.map((user) => {
              const isSelf = user.id === admin?.id;
              return (
                <div key={user.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                  <div>
                    <p className="text-sm font-bold text-[#0D1829]">{user.username}</p>
                    <p className="text-xs text-gray-500">{user.role === 'admin' ? 'Admin' : 'Student'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleRole(user)}
                    disabled={isSelf || pendingId === user.id}
                    title={isSelf ? "You can't change your own admin access here" : undefined}
                    className={`rounded-lg px-3 py-1.5 text-xs font-extrabold disabled:opacity-40 ${
                      user.role === 'admin' ? 'border border-red-200 text-red-600' : 'bg-[#1F6D46] text-white'
                    }`}
                  >
                    {pendingId === user.id ? '…' : user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AccountSettingsCard() {
  const { user: admin } = useAuth();
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailConfirmation, setEmailConfirmation] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordConfirmation, setPasswordConfirmation] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentEmail()
      .then(setCurrentEmail)
      .catch(() => setCurrentEmail(null));
  }, []);

  async function handleUpdateEmail() {
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    setEmailSaving(true);
    setEmailError(null);
    setEmailConfirmation(null);
    try {
      await updateEmail(trimmed, admin?.id ?? '', admin?.username ?? 'Admin');
      setEmailConfirmation('Check your new email to confirm the change.');
      setNewEmail('');
    } catch (err) {
      setEmailError(extractErrorMessage(err));
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleUpdatePassword() {
    setPasswordError(null);
    setPasswordConfirmation(null);
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      await updatePassword(newPassword, admin?.id ?? '', admin?.username ?? 'Admin');
      setPasswordConfirmation('Password updated.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(extractErrorMessage(err));
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col rounded-2xl bg-white p-5 shadow-sm">
      <p className="mb-4 text-xs font-bold tracking-wide text-gray-500">YOUR ACCOUNT</p>

      <p className="text-xs text-gray-500">Signed in as</p>
      <p className="mb-4 text-sm font-bold text-[#0D1829]">{currentEmail ?? '—'}</p>

      <label className="mb-1 block text-xs font-bold text-gray-500">New email</label>
      <div className="flex gap-2">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="new@example.com"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-black outline-none focus:border-[#1B2B4B]"
        />
        <button
          type="button"
          onClick={handleUpdateEmail}
          disabled={!newEmail.trim() || emailSaving}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-50"
        >
          {emailSaving ? '…' : 'Update'}
        </button>
      </div>
      {emailError && <p className="mt-2 text-xs text-red-600">{emailError}</p>}
      {emailConfirmation && <p className="mt-2 text-xs font-bold text-emerald-600">{emailConfirmation}</p>}

      <div className="mt-5 border-t border-gray-100 pt-5">
        <label className="mb-1 block text-xs font-bold text-gray-500">New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="••••••••"
          className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black outline-none focus:border-[#1B2B4B]"
        />
        <label className="mb-1 block text-xs font-bold text-gray-500">Confirm new password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black outline-none focus:border-[#1B2B4B]"
        />
        {passwordError && <p className="mt-2 text-xs text-red-600">{passwordError}</p>}
        {passwordConfirmation && <p className="mt-2 text-xs font-bold text-emerald-600">{passwordConfirmation}</p>}

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleUpdatePassword}
            disabled={!newPassword || !confirmPassword || passwordSaving}
            className="rounded-xl bg-[#1B2B4B] px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
          >
            {passwordSaving ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ActivityLogCard({ entries }: { entries: ActivityLogEntry[] | null }) {
  const [showAll, setShowAll] = useState(false);

  const visibleEntries = showAll ? entries : entries?.slice(0, 5);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-bold tracking-wide text-gray-500">
          ACTIVITY LOG
        </p>

        {entries && entries.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="text-xs font-bold text-[#1B2B4B] hover:underline"
          >
            {showAll ? 'Show less' : 'See all →'}
          </button>
        )}
      </div>

      {entries === null ? (
        <p className="text-xs text-gray-400">Could not load.</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-gray-400">No admin activity yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {visibleEntries?.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-sm text-[#0D1829]">
                  <span className="font-bold">{entry.adminUsername}</span>{' '}
                  {entry.action.toLowerCase()}
                  {entry.details ? (
                    <span className="text-gray-500">
                      {' '}— {entry.details}
                    </span>
                  ) : null}
                </p>
              </div>

              <span className="shrink-0 text-xs text-gray-400">
                {timeAgo(entry.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsOverview() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [settingsError, setSettingsError] = useState(false);
  const [activity, setActivity] = useState<ActivityLogEntry[] | null>(null);

  function loadActivity() {
    fetchRecentActivity()
      .then(setActivity)
      .catch(() => setActivity(null));
  }

  useEffect(() => {
    fetchAppSettings()
      .then(setSettings)
      .catch(() => setSettingsError(true));
    loadActivity();
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-6 lg:flex-row">
        {settingsError ? (
          <div className="flex flex-1 flex-col rounded-2xl bg-white p-5 shadow-sm">
            <p className="mb-4 text-xs font-bold tracking-wide text-gray-500">MODERATION</p>
            <p className="text-xs text-gray-400">Could not load moderation settings.</p>
          </div>
        ) : settings === null ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Loading…</p>
          </div>
        ) : (
          <ModerationCard settings={settings} onSaved={setSettings} />
        )}

        <AnnouncementCard onSent={loadActivity} />
      </div>

      <div className="mb-6 flex flex-col gap-6 lg:flex-row">
        <AdminManagementCard onChanged={loadActivity} />
        <AccountSettingsCard />
      </div>

      <ActivityLogCard entries={activity} />
    </div>
  );
}
