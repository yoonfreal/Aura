// Matches aura-app's AuraLogo mark (see aura-app's login.tsx) — a navy rounded square
// with three bars — redrawn as an SVG so it scales cleanly at sidebar size instead of
// relying on the app-store icon, which is a different image entirely.
export function AuraLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" fill="none">
      <rect width="112" height="112" rx="26" fill="#1B2B4B" />
      <rect x="12" y="12" width="88" height="88" rx="20" stroke="#2A4275" strokeWidth="1.5" />
      <rect x="30.5" y="52" width="13" height="26" rx="4" fill="#5B9BD5" />
      <rect x="49.5" y="34" width="13" height="44" rx="4" fill="#5B9BD5" />
      <rect x="68.5" y="44" width="13" height="34" rx="4" fill="#5B9BD5" />
    </svg>
  );
}
