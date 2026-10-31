import React from 'react';

export const PageSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
    <div className="space-y-2">
      <div className="h-8 bg-utsav-200/70 rounded-lg w-1/3" />
      <div className="h-4 bg-utsav-200/50 rounded w-1/2" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 bg-white border border-utsav-200 rounded-2xl p-4 space-y-3">
          <div className="h-3 bg-stone-200 rounded w-1/2" />
          <div className="h-7 bg-stone-200 rounded w-3/4" />
        </div>
      ))}
    </div>
    <div className="h-64 bg-white border border-utsav-200 rounded-2xl" />
  </div>
);

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon = 'event_busy',
}) => (
  <div className="max-w-md mx-auto py-16 px-4 text-center">
    <div className="w-16 h-16 rounded-2xl bg-utsav-100 text-festive-marigold mx-auto flex items-center justify-center mb-4">
      <span className="material-symbols-outlined text-3xl" aria-hidden="true">{icon}</span>
    </div>
    <h3 className="font-serif text-xl font-bold text-stone-900 mb-2">{title}</h3>
    <p className="text-stone-600 text-xs sm:text-sm mb-6 leading-relaxed">{description}</p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="px-5 py-2.5 bg-festive-marigold hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
