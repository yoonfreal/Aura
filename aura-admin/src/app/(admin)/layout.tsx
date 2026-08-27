'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuraLogo } from '@/components/AuraLogo';
import { BarChartIcon, GridIcon, TargetIcon } from '@/components/icons';
import { AuthProvider, useAuth } from '@/lib/AuthProvider';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: <GridIcon /> },
  { href: '/leaderboard', label: 'Leaderboard', icon: <BarChartIcon /> },
  { href: '/challenges', label: 'Challenges', icon: <TargetIcon /> },
];

function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-gray-100 bg-white">
      <div className="px-6 py-6">
        <div className="flex items-center gap-2">
          <AuraLogo size={28} />
          <p className="text-xl font-extrabold text-[#1B2B4B]">AUra</p>
        </div>
      </div>

      <nav className="flex-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ${
                active ? 'bg-[#1B2B4B] text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 px-6 py-4">
        <p className="mb-2 truncate text-xs font-bold text-gray-400">{user?.username ?? 'Admin'}</p>
        <button
          onClick={signOut}
          className="w-full rounded-lg bg-[#F5B800] px-3 py-2 text-xs font-extrabold text-[#1B2B4B]"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F6F9]">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F2F6F9]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
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
