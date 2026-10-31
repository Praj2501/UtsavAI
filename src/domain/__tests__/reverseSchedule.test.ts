import { describe, it, expect } from 'vitest';
import { reverseSchedule, ProposedTaskInput } from '../reverseSchedule';
import { parseDate } from '../dates';

describe('reverseSchedule', () => {
  const referenceNow = parseDate('2026-10-20');

  it('computes exact target dates for future tasks', () => {
    const tasks: ProposedTaskInput[] = [
      { id: 't1', title: 'Book Venue', category: 'Venue', leadDays: 60, priority: 'high' },
      { id: 't2', title: 'Send Invites', category: 'Invites', leadDays: 30, priority: 'medium' },
    ];

    const scheduled = reverseSchedule('2026-12-20', tasks, referenceNow);
    expect(scheduled[0]?.targetDate).toBe('2026-10-21');
    expect(scheduled[0]?.isOverdueAtCreation).toBe(false);
    expect(scheduled[1]?.targetDate).toBe('2026-11-20');
    expect(scheduled[1]?.isOverdueAtCreation).toBe(false);
  });

  it('clamps overdue target dates to now and flags isOverdueAtCreation: true', () => {
    const tasks: ProposedTaskInput[] = [
      { id: 't1', title: 'Book Pandit', category: 'Rituals', leadDays: 45, priority: 'high' },
    ];

    // Event is 10 days away, leadDays is 45 -> raw target date was 35 days in the past
    const scheduled = reverseSchedule('2026-10-30', tasks, referenceNow);
    expect(scheduled[0]?.targetDate).toBe('2026-10-20');
    expect(scheduled[0]?.isOverdueAtCreation).toBe(true);
  });

  it('handles event date today or in the past', () => {
    const tasks: ProposedTaskInput[] = [
      { id: 't1', title: 'Check Mic', category: 'Audio', leadDays: 0, priority: 'high' },
      { id: 't2', title: 'Prepare Stage', category: 'Decor', leadDays: 5, priority: 'medium' },
    ];

    const scheduledPast = reverseSchedule('2026-10-15', tasks, referenceNow);
    expect(scheduledPast[0]?.targetDate).toBe('2026-10-20');
    expect(scheduledPast[0]?.isOverdueAtCreation).toBe(true);
    expect(scheduledPast[1]?.targetDate).toBe('2026-10-20');
    expect(scheduledPast[1]?.isOverdueAtCreation).toBe(true);
  });
});
