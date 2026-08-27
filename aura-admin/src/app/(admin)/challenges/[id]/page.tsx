'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchChallengeById, updateChallenge } from '@/lib/challenges';
import { ChallengeForm, fromChallenge, toNewChallenge, type ChallengeFormValues } from '@/components/ChallengeForm';
import { NO_LIMIT_DAYS, addDaysISO } from '@/lib/dates';
import type { Challenge } from '@/lib/types';

export default function EditChallengePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [initial, setInitial] = useState<ChallengeFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChallengeById(id)
      .then((data) => {
        setChallenge(data);
        setInitial(fromChallenge(data));
      })
      .catch(() => setError('Could not load this challenge.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error || !challenge || !initial) return <p className="text-sm text-red-600">{error ?? 'Not found.'}</p>;

  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold text-[#0D1829]">Edit Challenge</h1>
      <ChallengeForm
        initial={initial}
        submitLabel="Save Changes"
        onSubmit={async (values) => {
          const draft = toNewChallenge(values);
          if (!draft) throw new Error('Invalid form');

          const endDate = addDaysISO(
            challenge.startDate,
            values.durationDays === null ? NO_LIMIT_DAYS : values.durationDays - 1,
          );

          await updateChallenge(challenge.id, {
            ...draft,
            startDate: challenge.startDate,
            endDate,
          });
          router.push('/');
        }}
      />
    </div>
  );
}
