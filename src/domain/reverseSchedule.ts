import { Task, TaskPriority } from '../types/event.types';
import { addDays, formatDate, isBeforeDate } from './dates';

export interface ProposedTaskInput {
  id: string;
  title: string;
  category: string;
  leadDays: number;
  priority: TaskPriority;
}

/**
 * Calculates calendar target dates for tasks by reverse-scheduling from the event date.
 * If a task's target date falls in the past relative to `now`, it is clamped to `now`
 * and flagged with `isOverdueAtCreation: true`.
 *
 * @param eventDateStr - Event date in YYYY-MM-DD format.
 * @param proposedTasks - Tasks proposed with relative lead days.
 * @param now - Current reference timestamp (required, no hidden Date instantiation).
 * @returns Fully scheduled tasks with computed dates and overdue flags.
 */
export function reverseSchedule(
  eventDateStr: string,
  proposedTasks: ProposedTaskInput[],
  now: Date
): Task[] {
  const todayStr = formatDate(now);

  return proposedTasks.map(task => {
    const rawTargetDate = addDays(eventDateStr, -Math.max(0, task.leadDays));
    const isOverdue = isBeforeDate(rawTargetDate, todayStr);
    const clampedDate = isOverdue ? todayStr : rawTargetDate;

    return {
      id: task.id,
      title: task.title,
      category: task.category,
      targetDate: clampedDate,
      leadDays: task.leadDays,
      status: 'todo',
      priority: task.priority,
      panicStatus: 'normal',
      isOverdueAtCreation: isOverdue,
    };
  });
}
