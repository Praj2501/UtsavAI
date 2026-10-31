import React, { useMemo } from 'react';
import { useEventStore } from '../../stores/eventStore';
import { diffInDays, formatDate } from '../../domain/dates';
import { budgetSummary } from '../../domain/budgetSummary';
import { compressTimeline } from '../../domain/compressTimeline';
import type { Task } from '../../types/event.types';

export const DashboardPage: React.FC = () => {
  const { currentEvent, budgetItems, tasks, setActiveView } = useEventStore();

  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDate(now), [now]);

  const eventDate = currentEvent?.date || '2026-11-20';
  const daysRemaining = Math.max(0, diffInDays(todayStr, eventDate));
  const summary = useMemo(() => budgetSummary(budgetItems), [budgetItems]);
  const compressed = useMemo(() => compressTimeline(tasks, eventDate, now), [tasks, eventDate, now]);

  const completedTasksCount = tasks.filter((t: Task) => t.status === 'done').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  const nextTasks = useMemo(() => {
    return tasks
      .filter((t: Task) => t.status !== 'done')
      .sort((a: Task, b: Task) => a.leadDays - b.leadDays)
      .slice(0, 4);
  }, [tasks]);

  const overdueTasks = useMemo(() => {
    return tasks.filter((t: Task) => t.status !== 'done' && (t.isOverdueAtCreation || t.panicStatus === 'do_now'));
  }, [tasks]);

  if (!currentEvent) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <h2 className="font-serif text-2xl font-bold text-stone-800 mb-2">No Active Event Selected</h2>
        <p className="text-stone-600 text-sm mb-6">Create a new celebration blueprint or load our demo scenario.</p>
        <button
          onClick={() => setActiveView('blueprint')}
          className="px-6 py-2.5 bg-festive-marigold text-white font-semibold rounded-xl"
        >
          Create Blueprint
        </button>
      </div>
    );
  }

  // SVG circular progress calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-festive-marigold to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm text-white mb-2">
              <span className="material-symbols-outlined text-xs">location_on</span>
              {currentEvent.city} • {currentEvent.tradition || currentEvent.eventType}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight mb-1">
              {currentEvent.title}
            </h1>
            <p className="text-orange-100 text-sm">
              Event Date: {currentEvent.date} ({daysRemaining} days to go)
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20">
            <span className="material-symbols-outlined text-4xl text-amber-200">timer</span>
            <div>
              <div className="text-3xl font-extrabold tracking-tight">{daysRemaining}</div>
              <div className="text-xs text-orange-100 font-medium uppercase tracking-wider">Days Countdown</div>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue / Panic Alerts */}
      {overdueTasks.length > 0 && (
        <div role="alert" className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-700 text-2xl">warning</span>
          <div className="flex-1">
            <h4 className="font-semibold text-amber-900 text-sm">
              {compressed.summary.isPanicActive ? 'Panic Mode Active' : 'Action Required'}
            </h4>
            <p className="text-amber-800 text-xs mt-0.5">
              You have {overdueTasks.length} task(s) flagged for immediate attention. Review critical milestones to stay on schedule.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Row: Progress Ring & Budget Burn Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Progress Ring Card */}
        <div className="bg-white p-6 rounded-2xl border border-utsav-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Milestone Progress</span>
            <h3 className="font-serif text-2xl font-bold text-stone-900 mt-1">
              {completedTasksCount} of {tasks.length} Completed
            </h3>
            <p className="text-stone-500 text-xs mt-2">
              {tasks.length - completedTasksCount} milestones remaining before event day.
            </p>
          </div>

          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-stone-100"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-festive-marigold transition-all duration-500 ease-out"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <span className="absolute font-serif text-lg font-bold text-stone-900">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Budget Burn Bar Card */}
        <div className="bg-white p-6 rounded-2xl border border-utsav-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Budget Burn Rate</span>
              <span className="text-xs font-bold text-festive-marigold">
                {summary.burnPercentage}% Utilized
              </span>
            </div>
            <h3 className="font-serif text-2xl font-bold text-stone-900">
              ₹{summary.totalActual.toLocaleString('en-IN')}{' '}
              <span className="text-sm font-normal text-stone-500">
                / ₹{currentEvent.totalBudget.toLocaleString('en-IN')}
              </span>
            </h3>
          </div>

          <div className="mt-4">
            <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  summary.burnPercentage > 90 ? 'bg-red-500' : 'bg-festive-marigold'
                }`}
                style={{ width: `${Math.min(100, summary.burnPercentage)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-stone-500 mt-2 font-medium">
              <span>Paid: ₹{summary.totalPaid.toLocaleString('en-IN')}</span>
              <span>Available: ₹{summary.totalRemaining.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Next Tasks & Cultural Palette Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-utsav-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg font-bold text-stone-900">Next Upcoming Tasks</h3>
            <span className="text-xs text-stone-500 font-medium">{nextTasks.length} queued</span>
          </div>

          <div className="space-y-3">
            {nextTasks.length === 0 ? (
              <p className="text-stone-500 text-sm py-4">All milestones completed!</p>
            ) : (
              nextTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 hover:border-utsav-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <div>
                      <div className="text-sm font-medium text-stone-800">{task.title}</div>
                      <div className="text-xs text-stone-500">{task.category} • Target: {task.targetDate}</div>
                    </div>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      task.panicStatus === 'do_now'
                        ? 'bg-red-100 text-red-700'
                        : task.priority === 'high'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {task.panicStatus === 'do_now' ? 'DO NOW' : task.priority.toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-utsav-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-900 mb-3">Celebration Palette</h3>
            {currentEvent.themes && currentEvent.themes[0] && (
              <div>
                <h4 className="text-sm font-semibold text-stone-800">{currentEvent.themes[0].name}</h4>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  {currentEvent.themes[0].decorDescription}
                </p>
                <div className="flex items-center gap-2 mt-4">
                  {currentEvent.themes[0].palette.map((color: string, i: number) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border border-stone-200 shadow-xs"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>Guests: {currentEvent.guestCount}</span>
            <span>RSVPs: {currentEvent.guestCount} invited</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
