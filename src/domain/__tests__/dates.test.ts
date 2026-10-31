import { describe, it, expect } from 'vitest';
import { parseDate, formatDate, addDays, diffInDays, isBeforeDate, isAfterDate } from '../dates';

describe('dates utility (UTC-safe)', () => {
  it('parses and formats YYYY-MM-DD consistently without local timezone drift', () => {
    const parsed = parseDate('2026-11-20');
    expect(parsed.getUTCFullYear()).toBe(2026);
    expect(parsed.getUTCMonth()).toBe(10); // 0-indexed November
    expect(parsed.getUTCDate()).toBe(20);
    expect(formatDate(parsed)).toBe('2026-11-20');
  });

  it('throws on invalid date strings', () => {
    expect(() => parseDate('20-11-2026')).toThrow(/Invalid date format/);
    expect(() => parseDate('invalid')).toThrow(/Invalid date format/);
  });

  it('adds and subtracts days accurately across month and leap boundaries', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('computes integer day differences', () => {
    expect(diffInDays('2026-11-01', '2026-11-20')).toBe(19);
    expect(diffInDays('2026-11-20', '2026-11-01')).toBe(-19);
    expect(diffInDays('2026-11-20', '2026-11-20')).toBe(0);
  });

  it('evaluates isBeforeDate and isAfterDate correctly', () => {
    expect(isBeforeDate('2026-10-01', '2026-11-01')).toBe(true);
    expect(isBeforeDate('2026-11-01', '2026-10-01')).toBe(false);
    expect(isAfterDate('2026-12-01', '2026-11-01')).toBe(true);
  });
});
