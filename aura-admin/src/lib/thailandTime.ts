// Mirrors aura-app's src/lib/thailandTime.ts. Every "what day/week is it" decision here
// (today markers, weekly/monthly leaderboard windows, matching aura-app's own daily_stats
// bucketing) must agree with the mobile app's definition of "today" — which is always
// Thailand's calendar day, never UTC's and never whatever timezone the admin's own browser
// happens to be in. An admin viewing this dashboard from outside Thailand must still see
// the same "today" a student in Bangkok does. Uses Intl's timeZone support rather than
// manual offset math, since Thailand has no DST to get wrong but a hand-rolled UTC+7 shift
// is an easy way to reintroduce this exact bug.
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

// This week's Monday–Sunday range in Thailand, anchored to "today" there.
export function thailandWeekRange(offsetWeeks = 0): { start: string; end: string } {
  const today = thailandDateISO();
  const todayIdx = thailandWeekdayIndex(today);
  const start = addDaysToISO(today, -todayIdx + offsetWeeks * 7);
  const end = addDaysToISO(start, 6);
  return { start, end };
}

// The first day of the calendar month `dateISO` falls in, in Thailand.
export function thailandMonthStart(dateISO: string = thailandDateISO()): string {
  const [y, m] = dateISO.split('-');
  return `${y}-${m}-01`;
}
