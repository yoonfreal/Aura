import { addDaysToISO, thailandDateISO } from './thailandTime';

export const NO_LIMIT_DAYS = 36500;

export function addDaysISO(base: string, days: number): string {
  return addDaysToISO(base, days);
}

export function todayISO(): string {
  return thailandDateISO();
}
