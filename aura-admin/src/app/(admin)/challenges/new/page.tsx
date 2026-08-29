'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { createChallenge } from '@/lib/challenges';
import { ChallengeForm, emptyChallengeForm, resolveEndDate, toNewChallenge } from '@/components/ChallengeForm';
import { todayISO } from '@/lib/dates';

export default function NewChallengePage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div>
      <Link href="/challenges" className="mb-2 inline-block text-xs font-bold text-gray-500 hover:text-[#1B2B4B]">
        &larr; Back to Challenges
      </Link>
      <h1 className="mb-6 text-xl font-extrabold text-[#0D1829]">New Challenge</h1>
      <ChallengeForm
        initial={emptyChallengeForm}
        submitLabel="Create Challenge"
        onSubmit={async (values) => {
          if (!user) return;
          const draft = toNewChallenge(values);
          if (!draft) throw new Error('Invalid form');

          const startDate = todayISO();
          const endDate = resolveEndDate(values, startDate);

          await createChallenge(user.id, { ...draft, startDate, endDate });
          router.push('/challenges');
        }}
      />
    </div>
  );
}
