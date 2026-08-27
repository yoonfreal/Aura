// Small line icons for stat cards — same stroke style as the eye/trash/filter icons used
// elsewhere in the admin app, kept here so pages can share a consistent icon set instead
// of each rolling its own emoji or SVG.

function base(children: React.ReactNode) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export function TargetIcon() {
  return base(
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>,
  );
}

export function UsersIcon() {
  return base(
    <>
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="9" cy="8" r="3.5" />
      <path d="M21 20v-1.5a3.5 3.5 0 0 0-2.5-3.35" />
      <path d="M14.5 4.65a3.5 3.5 0 0 1 0 6.7" />
    </>,
  );
}

export function UserIcon() {
  return base(
    <>
      <path d="M18 20v-1.5a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4V20" />
      <circle cx="12" cy="8" r="4" />
    </>,
  );
}

export function RepeatIcon() {
  return base(
    <>
      <polyline points="16 3 20 7 16 11" />
      <path d="M4 12V9a2 2 0 0 1 2-2h14" />
      <polyline points="8 21 4 17 8 13" />
      <path d="M20 12v3a2 2 0 0 1-2 2H4" />
    </>,
  );
}

export function ShieldIcon() {
  return base(<path d="M12 21s7-3.5 7-9V5.5L12 3 5 5.5V12c0 5.5 7 9 7 9z" />);
}

export function ZapIcon() {
  return base(<polygon points="12 2 4 13 11 13 10 22 20 10 13 10 12 2" />);
}

export function CheckCircleIcon() {
  return base(
    <>
      <path d="M21 11.08V12a9 9 0 1 1-5.34-8.23" />
      <polyline points="21 4 12 13.01 9 10.01" />
    </>,
  );
}

export function GridIcon() {
  return base(
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>,
  );
}

export function BarChartIcon() {
  return base(
    <>
      <rect x="4" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="7" width="4" height="13" rx="1" />
      <rect x="16" y="3" width="4" height="17" rx="1" />
    </>,
  );
}

export function DumbbellIcon() {
  return base(
    <>
      <line x1="6.5" y1="12" x2="17.5" y2="12" />
      <rect x="2" y="8.5" width="3.5" height="7" rx="1" />
      <rect x="18.5" y="8.5" width="3.5" height="7" rx="1" />
    </>,
  );
}
