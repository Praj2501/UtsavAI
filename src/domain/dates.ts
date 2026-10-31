/**
 * UTC-safe date utility for event milestone arithmetic.
 * Ensures consistent calculation across all timezones without local skew.
 */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a YYYY-MM-DD string into a UTC midnight Date object.
 */
export function parseDate(dateStr: string): Date {
  if (!DATE_REGEX.test(dateStr)) {
    throw new Error(`Invalid date format, expected YYYY-MM-DD: received ${dateStr}`);
  }
  const parts = dateStr.split('-');
  const year = parseInt(parts[0] ?? '0', 10);
  const month = parseInt(parts[1] ?? '1', 10) - 1;
  const day = parseInt(parts[2] ?? '1', 10);

  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Formats a Date object to a YYYY-MM-DD string using UTC components.
 */
export function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds or subtracts days from a YYYY-MM-DD string, returning a new YYYY-MM-DD string.
 */
export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
}

/**
 * Calculates (end - start) in whole integer days.
 * Returns positive if end is after start, negative if before.
 */
export function diffInDays(startStr: string, endStr: string): number {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

/**
 * Returns true if dateA is strictly before dateB.
 */
export function isBeforeDate(dateA: string, dateB: string): boolean {
  return diffInDays(dateA, dateB) > 0;
}

/**
 * Returns true if dateA is strictly after dateB.
 */
export function isAfterDate(dateA: string, dateB: string): boolean {
  return diffInDays(dateA, dateB) < 0;
}
