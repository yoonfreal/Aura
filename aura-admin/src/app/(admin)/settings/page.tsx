'use client';

import { SettingsOverview } from '@/components/SettingsOverview';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-extrabold text-[#0D1829]">Settings</h1>
      <SettingsOverview />
    </div>
  );
}
