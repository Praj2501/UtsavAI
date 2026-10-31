import { PanicStatus, Task } from '../types/event.types';
import { diffInDays, formatDate } from './dates';
import { PANIC_RULES, TIMELINE_CONSTANTS } from '../constants/timeline.constants';

export interface CompressedTimelineResult {
  tasks: Task[];
  summary: {
    isPanicActive: boolean;
    daysRemaining: number;
    doNow: number;
    outsource: number;
    skip: number;
  };
}

function resolvePanicStatus(task: Task, daysRemaining: number): PanicStatus {
  if (task.status === 'done') {
    return 'normal';
  }

  if (daysRemaining <= PANIC_RULES.EMERGENCY.maxDaysRemaining) {
    if (task.priority === 'high') return PANIC_RULES.EMERGENCY.high;
    if (task.priority === 'medium') return PANIC_RULES.EMERGENCY.medium;
    return PANIC_RULES.EMERGENCY.low;
  }

  if (daysRemaining <= PANIC_RULES.CRITICAL.maxDaysRemaining) {
    if (task.priority === 'high') return PANIC_RULES.CRITICAL.high;
    if (task.priority === 'medium') return PANIC_RULES.CRITICAL.medium;
    return PANIC_RULES.CRITICAL.low;
  }

  // Between 30 and 90 days
  const isTaskBehind = task.leadDays > daysRemaining;
  if (!isTaskBehind) return PANIC_RULES.COMPRESSED.onTrack;

  if (task.priority === 'high') return PANIC_RULES.COMPRESSED.overdueHigh;
  if (task.priority === 'medium') return PANIC_RULES.COMPRESSED.overdueMedium;
  return PANIC_RULES.COMPRESSED.overdueLow;
}

/**
 * Evaluates event timeline against ideal lead times and applies Panic Mode adjustments.
 * Assigns do_now, outsource, or skip flags deterministically based on priority and remaining days.
 */
export function compressTimeline(
  tasks: Task[],
  eventDateStr: string,
  now: Date
): CompressedTimelineResult {
  const todayStr = formatDate(now);
  const daysRemaining = Math.max(0, diffInDays(todayStr, eventDateStr));
  const isPanicActive = daysRemaining < TIMELINE_CONSTANTS.IDEAL_LEAD_TIME_DAYS;

  let doNow = 0;
  let outsource = 0;
  let skip = 0;

  const compressedTasks = tasks.map(task => {
    if (!isPanicActive) {
      return { ...task, panicStatus: 'normal' as PanicStatus };
    }
    const panicStatus = resolvePanicStatus(task, daysRemaining);
    if (panicStatus === 'do_now') doNow++;
    else if (panicStatus === 'outsource') outsource++;
    else if (panicStatus === 'skip') skip++;

    return { ...task, panicStatus };
  });

  return {
    tasks: compressedTasks,
    summary: { isPanicActive, daysRemaining, doNow, outsource, skip },
  };
}
