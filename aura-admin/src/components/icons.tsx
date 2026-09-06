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

export function FlagIcon() {
  return base(
    <>
      <path d="M5 21V4" />
      <path d="M5 4h13l-3.5 4.5L18 13H5" />
    </>,
  );
}

export function MedalIcon() {
  return base(
    <>
      <path d="M7 3l3 8" />
      <path d="M17 3l-3 8" />
      <circle cx="12" cy="16" r="5" />
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

export function FootprintsIcon() {
  return base(
    <>
      <ellipse cx="8" cy="16" rx="3" ry="4.5" transform="rotate(-15 8 16)" />
      <circle cx="10.4" cy="9.6" r="1" />
      <circle cx="8.4" cy="8.2" r="1" />
      <circle cx="6.6" cy="7.4" r="0.9" />
      <ellipse cx="16" cy="9" rx="3" ry="4.5" transform="rotate(15 16 9)" />
      <circle cx="13.6" cy="15.4" r="1" />
      <circle cx="15.6" cy="16.8" r="1" />
      <circle cx="17.4" cy="17.6" r="0.9" />
    </>,
  );
}

export function FlameIcon() {
  return base(
    <path d="M12 22c4 0 7-2.5 7-6.5 0-3-2-5-3-6.5.2 2-1 3-1.8 2C13 9 13.5 6 12 3c.3 2.5-1.5 4-3 6-1.2 1.6-2 3-2 5.5C7 20 8.5 22 12 22z" />,
  );
}

export function QrCodeIcon() {
  return base(
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="3" height="3" rx="0.5" />
      <rect x="18" y="14" width="3" height="3" rx="0.5" />
      <rect x="14" y="18" width="3" height="3" rx="0.5" />
      <rect x="18" y="18" width="3" height="3" rx="0.5" />
    </>,
  );
}

export function TrendingUpIcon() {
  return base(
    <>
      <polyline points="3 17 9 11 13 15 21 6" />
      <polyline points="15 6 21 6 21 12" />
    </>,
  );
}

export function GearIcon() {
  return base(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>,
  );
}

export function MegaphoneIcon() {
  return base(
    <>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l3.5 4.5A1 1 0 0 0 11 18V6a1 1 0 0 0-1.5-.87L6 10H4a1 1 0 0 0-1 1z" />
      <path d="M15 8a3 3 0 0 1 0 8" />
      <path d="M18 5.5a6.5 6.5 0 0 1 0 13" />
    </>,
  );
}

export function ClipboardListIcon() {
  return base(
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 3h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="16" y2="15" />
      <line x1="8" y1="19" x2="12" y2="19" />
    </>,
  );
}
