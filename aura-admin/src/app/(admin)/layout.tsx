'use client';

import Link from 'next/link';
import { AuthProvider, useAuth } from '@/lib/AuthProvider';

function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F6F9]">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F6F9]">
      <header className="flex items-center justify-between bg-[#1B2B4B] px-6 py-4">
        <Link href="/" className="text-lg font-extrabold text-white">
          AUra Admin
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{user.username ?? 'Admin'}</span>
          <button
            onClick={signOut}
            className="rounded-lg bg-[#F5B800] px-3 py-1.5 text-xs font-bold text-[#1B2B4B]"
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
