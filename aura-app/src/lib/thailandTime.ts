
const THAILAND_TZ = 'Asia/Bangkok';

export function thailandDateISO(instant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: THAILAND_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

export function thailandHour(instant: Date = new Date()): number {
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: THAILAND_TZ,
    hour: 'numeric',
    hour12: false,
  }).format(instant);
  return parseInt(hourStr, 10) % 24;
}

// used by Streaks, weekly chart, this week vs last week, admin challenges date, posts from the last few days
export function addDaysToISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().split('T')[0];
}

// shows which day of the week, monday=0, sunday=6, for a date in Thailand. used by weekly chart
export function thailandWeekdayIndex(dateISO: string): number {
  const [y, m, d] = dateISO.split('-').map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  return (jsDay + 6) % 7; // 0=Mon..6=Sun
}

export function startOfThailandDay(dateISO: string = thailandDateISO()): Date {
  return new Date(`${dateISO}T00:00:00+07:00`);
}

export function isStreakStillAlive(lastActiveDate: string | null): boolean {
  if (!lastActiveDate) return false;
  const today = thailandDateISO();
  const yesterday = addDaysToISO(today, -1);
  return lastActiveDate === today || lastActiveDate === yesterday;
}

export function thailandRollingWeekRange(offsetWeeks = 0): { start: string; end: string } {
  const end = addDaysToISO(thailandDateISO(), offsetWeeks * 7);
  return { start: addDaysToISO(end, -6), end };
}

// used by weekly leaderboard, Mon-Sun
export function thailandWeekRange(offsetWeeks = 0): { start: string; end: string } {
  const today = thailandDateISO();
  const todayIdx = thailandWeekdayIndex(today);
  const start = addDaysToISO(today, -todayIdx + offsetWeeks * 7); // to Monday
  const end = addDaysToISO(start, 6);
  return { start, end };
}
