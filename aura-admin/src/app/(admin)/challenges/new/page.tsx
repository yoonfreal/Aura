'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { createChallenge } from '@/lib/challenges';
import { ChallengeForm, emptyChallengeForm, toNewChallenge } from '@/components/ChallengeForm';
import { NO_LIMIT_DAYS, addDaysISO, todayISO } from '@/lib/dates';

export default function NewChallengePage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold text-[#0D1829]">New Challenge</h1>
      <ChallengeForm
        initial={emptyChallengeForm}
        submitLabel="Create Challenge"
        onSubmit={async (values) => {
          if (!user) return;
          const draft = toNewChallenge(values);
          if (!draft) throw new Error('Invalid form');

          const startDate = todayISO();
          const endDate = addDaysISO(
            startDate,
            values.durationDays === null ? NO_LIMIT_DAYS : values.durationDays - 1,
          );

          await createChallenge(user.id, { ...draft, startDate, endDate });
          router.push('/');
        }}
      />
    </div>
  );
}
