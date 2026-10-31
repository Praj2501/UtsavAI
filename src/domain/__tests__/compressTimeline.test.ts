import { describe, it, expect } from 'vitest';
import { compressTimeline } from '../compressTimeline';
import { Task } from '../../types/event.types';
import { parseDate } from '../dates';

describe('compressTimeline (Panic Mode)', () => {
  const referenceNow = parseDate('2026-10-20');

  const sampleTasks: Task[] = [
    { id: '1', title: 'Venue', category: 'Venue', targetDate: '2026-10-20', leadDays: 90, status: 'todo', priority: 'high', panicStatus: 'normal' },
    { id: '2', title: 'Catering', category: 'Food', targetDate: '2026-10-20', leadDays: 60, status: 'todo', priority: 'medium', panicStatus: 'normal' },
    { id: '3', title: 'Favors', category: 'Gifts', targetDate: '2026-10-20', leadDays: 45, status: 'todo', priority: 'low', panicStatus: 'normal' },
    { id: '4', title: 'Done Task', category: 'Misc', targetDate: '2026-10-20', leadDays: 100, status: 'done', priority: 'high', panicStatus: 'normal' },
  ];

  it('keeps normal statuses when event lead time is greater than 90 days', () => {
    // 100 days away
    const result = compressTimeline(sampleTasks, '2027-01-28', referenceNow);
    expect(result.summary.isPanicActive).toBe(false);
    expect(result.tasks.every(t => t.panicStatus === 'normal')).toBe(true);
  });

  it('compresses tasks when lead time is under 90 days (compressed zone)', () => {
    // 50 days away: task 1 (lead 90, high) -> do_now, task 2 (lead 60, med) -> do_now, task 3 (lead 45, low) -> normal
    const result = compressTimeline(sampleTasks, '2026-12-09', referenceNow);
    expect(result.summary.isPanicActive).toBe(true);
    expect(result.summary.daysRemaining).toBe(50);
    expect(result.tasks[0]?.panicStatus).toBe('do_now');
    expect(result.tasks[1]?.panicStatus).toBe('do_now');
    expect(result.tasks[2]?.panicStatus).toBe('normal');
    expect(result.tasks[3]?.panicStatus).toBe('normal'); // Done task stays normal
  });

  it('escalates to critical mode when event is within 30 days', () => {
    // 20 days away
    const result = compressTimeline(sampleTasks, '2026-11-09', referenceNow);
    expect(result.summary.daysRemaining).toBe(20);
    expect(result.tasks[0]?.panicStatus).toBe('do_now');
    expect(result.tasks[1]?.panicStatus).toBe('do_now');
    expect(result.tasks[2]?.panicStatus).toBe('outsource');
    expect(result.summary.outsource).toBe(1);
  });

  it('activates emergency mode when event is within 7 days', () => {
    // 3 days away: high -> do_now, medium -> outsource, low -> skip
    const result = compressTimeline(sampleTasks, '2026-10-23', referenceNow);
    expect(result.summary.daysRemaining).toBe(3);
    expect(result.tasks[0]?.panicStatus).toBe('do_now');
    expect(result.tasks[1]?.panicStatus).toBe('outsource');
    expect(result.tasks[2]?.panicStatus).toBe('skip');
    expect(result.summary.skip).toBe(1);
    expect(result.summary.outsource).toBe(1);
    expect(result.summary.doNow).toBe(1);
  });
});
