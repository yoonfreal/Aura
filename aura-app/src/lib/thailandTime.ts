// Every "what day is it" / "what week is it" decision in the app (daily_stats resets,
// streaks, weekly stats, mission windows) must agree on the same calendar day — and that
// day is always Thailand's, not UTC's and not whatever timezone the device happens to be
// set to. UTC in particular can be a full day off: 11pm in Bangkok is already "tomorrow"
// in UTC. Everything here goes through Intl's timeZone support (Hermes ships full ICU, so
// this works with no extra dependency) rather than manual offset math, since Thailand has
// no DST to get wrong but a hand-rolled UTC+7 shift is an easy way to reintroduce this bug.
const THAILAND_TZ = 'Asia/Bangkok';

// The calendar date (YYYY-MM-DD) `instant` falls on in Thailand.
export function thailandDateISO(instant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: THAILAND_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

// The hour of day (0–23) in Thailand for `instant` — for time-of-day checks like "after 6pm."
export function thailandHour(instant: Date = new Date()): number {
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: THAILAND_TZ,
    hour: 'numeric',
    hour12: false,
  }).format(instant);
  return parseInt(hourStr, 10) % 24;
}

// Adds `days` to a Y-M-D calendar date string. Pure calendar arithmetic — once we already
// have the correct Thailand-local date as a plain string, no further timezone conversion
// is needed, so this deliberately uses UTC internally just as a neutral calendar to avoid
// DST/offset surprises from the runtime's own local timezone.
export function addDaysToISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().split('T')[0];
}

// Monday-anchored weekday index (0=Mon..6=Sun) for a Y-M-D calendar date string.
export function thailandWeekdayIndex(dateISO: string): number {
  const [y, m, d] = dateISO.split('-').map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  return (jsDay + 6) % 7; // 0=Mon..6=Sun
}

// The instant that is 00:00:00 in Thailand on `dateISO` (defaults to today there) — for
// "since the start of today" comparisons against real timestamptz columns, without relying
// on the runtime's own local timezone the way `new Date().setHours(0,0,0,0)` would.
export function startOfThailandDay(dateISO: string = thailandDateISO()): Date {
  return new Date(`${dateISO}T00:00:00+07:00`);
}

// This week's Monday–Sunday range in Thailand, anchored to "today" there.
export function thailandWeekRange(offsetWeeks = 0): { start: string; end: string } {
  const today = thailandDateISO();
  const todayIdx = thailandWeekdayIndex(today);
  const start = addDaysToISO(today, -todayIdx + offsetWeeks * 7);
  const end = addDaysToISO(start, 6);
  return { start, end };
}
