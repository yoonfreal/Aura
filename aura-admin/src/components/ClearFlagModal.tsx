'use client';

import { useState } from 'react';
import { clearUserFlag, type AdminUser } from '@/lib/users';
import { sendAdminWarning } from '@/lib/notifications';

const DEFAULT_WARNING_MESSAGE =
  'Your account was flagged for unusual activity. Please play fair — repeated flags may result in suspension.';

function extractErrorMessage(err: unknown): string {
  // Supabase errors are plain objects ({message, details, hint, code}), not real Error
  // instances, so a bare String(err) or console.error alone just shows "[object Object]".
  const e = err as { message?: string } | null;
  return e?.message ?? JSON.stringify(err);
}

export function ClearFlagModal({
  user,
  adminId,
  adminUsername,
  onClose,
  onCleared,
}: {
  user: AdminUser;
  adminId: string | null;
  adminUsername: string | null;
  onClose: () => void;
  onCleared: (result: { note: string | null }) => void;
}) {
  const [note, setNote] = useState('');
  const [sendWarning, setSendWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState(DEFAULT_WARNING_MESSAGE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    if (sendWarning && warningMessage.trim() && adminId) {
      try {
        await sendAdminWarning(user.id, adminId, warningMessage.trim());
      } catch (err) {
        console.error('sendAdminWarning failed', err);
        setError(`Could not send the warning (${extractErrorMessage(err)}) — clearing the flag anyway.`);
      }
    }

    const trimmedNote = note.trim() || null;
    try {
      await clearUserFlag(user.id, adminUsername, trimmedNote);
      onCleared({ note: trimmedNote });
    } catch (err) {
      setSubmitting(false);
      setError(`Could not clear the flag (${extractErrorMessage(err)}). Try again.`);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-[26rem] rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-extrabold text-[#0D1829]">Clear flag on {user.username}</p>
        {user.flagReason && <p className="mt-1 text-xs text-gray-500">{user.flagReason}</p>}

        <label className="mb-4 mt-4 block">
          <span className="mb-1 block text-xs font-bold tracking-wide text-gray-500">NOTE (OPTIONAL)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why was this cleared? e.g. false alarm, or warned the user…"
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-black outline-none focus:border-[#1B2B4B]"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={sendWarning}
            onChange={(e) => setSendWarning(e.target.checked)}
            className="h-4 w-4 accent-[#1B2B4B]"
          />
          <span className="text-xs font-bold text-gray-700">Also send a warning notification to this user</span>
        </label>

        {sendWarning && (
          <textarea
            value={warningMessage}
            onChange={(e) => setWarningMessage(e.target.value)}
            rows={3}
            className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-black outline-none focus:border-[#1B2B4B]"
          />
        )}

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-bold text-gray-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-xl bg-[#1B2B4B] py-2 text-sm font-extrabold text-white disabled:opacity-50"
          >
            {submitting ? 'Clearing…' : 'Clear Flag'}
          </button>
        </div>
      </div>
    </div>
  );
}
