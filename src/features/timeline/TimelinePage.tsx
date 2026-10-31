import React, { useState } from 'react';
import { useEventStore } from '../../stores/eventStore';
import { compressTimeline } from '../../domain/compressTimeline';
import { Task } from '../../types/event.types';
import { EmptyState } from '../../components/common/States';

export const TimelinePage: React.FC = () => {
  const { currentEvent, tasks, updateTaskStatus, setActiveView } = useEventStore();
  const [isPanicModeActive, setIsPanicModeActive] = useState<boolean>(false);

  if (!currentEvent) {
    return (
      <EmptyState
        title="No Timeline Available"
        description="Load an event or generate an AI blueprint to calculate reverse milestones."
        actionLabel="Create Blueprint"
        onAction={() => setActiveView('blueprint')}
        icon="schedule"
      />
    );
  }

  const now = new Date();
  const compressed = compressTimeline(tasks, currentEvent.date, now);

  const displayedTasks = isPanicModeActive ? compressed.tasks : tasks;

  // Sort tasks by leadDays descending (earliest preparatory tasks first)
  const sortedTasks = [...displayedTasks].sort((a, b) => b.leadDays - a.leadDays);

  const handleStatusChange = (task: Task) => {
    const nextStatus: Task['status'] =
      task.status === 'todo'
        ? 'in_progress'
        : task.status === 'in_progress'
        ? 'done'
        : 'todo';
    void updateTaskStatus(task.id, nextStatus);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            Reverse Timeline & Execution
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Backwards-scheduled milestones for {currentEvent.title} (Target: {currentEvent.date})
          </p>
        </div>

        {/* Panic Mode Toggle Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPanicModeActive(!isPanicModeActive)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm ${
              isPanicModeActive
                ? 'bg-red-600 text-white ring-2 ring-red-400 ring-offset-2'
                : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50'
            }`}
            aria-pressed={isPanicModeActive}
          >
            <span>🚨</span>
            <span>{isPanicModeActive ? 'Disable Panic Mode' : 'Activate Panic Mode'}</span>
          </button>
        </div>
      </div>

      {/* Panic Mode Banner */}
      {isPanicModeActive && (
        <div className="mb-8 p-5 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                <h3 className="text-sm font-bold text-red-900 uppercase tracking-wider">
                  Panic Mode Active ({compressed.summary.daysRemaining} days remaining)
                </h3>
              </div>
              <p className="text-xs text-stone-700 mt-1 max-w-2xl">
                The timeline has been compressed using priority rules. Focus immediately on critical items, outsource medium-complexity tasks, and skip low-priority overhead.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-100 text-red-800 border border-red-200">
                {compressed.summary.doNow} DO NOW
              </span>
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                {compressed.summary.outsource} OUTSOURCE
              </span>
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-stone-200 text-stone-700">
                {compressed.summary.skip} SKIP
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Timeline List */}
      <div className="space-y-4">
        {sortedTasks.map((task) => {
          const isDone = task.status === 'done';
          const isInProgress = task.status === 'in_progress';

          return (
            <div
              key={task.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isDone
                  ? 'bg-stone-50 border-stone-200 opacity-60'
                  : 'bg-white border-utsav-200 hover:border-utsav-300 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleStatusChange(task)}
                  className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all border ${
                    isDone
                      ? 'bg-green-600 text-white border-green-600'
                      : isInProgress
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'border-stone-300 hover:border-stone-400 bg-white'
                  }`}
                  aria-label={`Toggle task status for ${task.title}`}
                >
                  {isDone ? '✓' : isInProgress ? '⏳' : ''}
                </button>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-bold ${
                        isDone ? 'line-through text-stone-500' : 'text-stone-900'
                      }`}
                    >
                      {task.title}
                    </span>

                    {/* Panic Mode Directives */}
                    {isPanicModeActive && task.panicStatus && task.panicStatus !== 'normal' && (
                      <span
                        className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                          task.panicStatus === 'do_now'
                            ? 'bg-red-600 text-white'
                            : task.panicStatus === 'outsource'
                            ? 'bg-amber-500 text-white'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {task.panicStatus.replace('_', ' ')}
                      </span>
                    )}

                    <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100">
                      {task.category}
                    </span>

                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        task.priority === 'high'
                          ? 'bg-red-50 text-red-700'
                          : task.priority === 'medium'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* Due Date & Lead Days */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100 text-xs text-stone-500">
                <span className="font-mono font-medium text-stone-700">
                  Target: {task.targetDate || 'Pending calculation'}
                </span>
                <span className="text-[11px] text-stone-400 mt-0.5">
                  T-{task.leadDays} days before event
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelinePage;
