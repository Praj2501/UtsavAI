import React from 'react';
import { DiffProposal } from '../../types/diff.types';

interface DiffCardProps {
  proposal: DiffProposal;
  onAccept: (proposal: DiffProposal) => void;
  onUndo: (proposal: DiffProposal) => void;
  isProcessing?: boolean;
}

export const DiffCard: React.FC<DiffCardProps> = ({
  proposal,
  onAccept,
  onUndo,
  isProcessing = false,
}) => {
  const { diff, status } = proposal;

  const entityBadgeColors = {
    budget: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    task: 'bg-blue-50 text-blue-800 border-blue-200',
    vendor: 'bg-purple-50 text-purple-800 border-purple-200',
  }[diff.entity];

  const opBadgeColors = {
    create: 'bg-green-100 text-green-800',
    update: 'bg-amber-100 text-amber-800',
    delete: 'bg-red-100 text-red-800',
  }[diff.op];

  return (
    <div
      className={`p-4 rounded-xl border transition-all text-xs ${
        status === 'accepted'
          ? 'bg-emerald-50/50 border-emerald-300'
          : status === 'undone'
          ? 'bg-stone-50 border-stone-200 opacity-60'
          : 'bg-white border-utsav-200 shadow-sm'
      }`}
      role="region"
      aria-label={`Proposal: ${diff.summary}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${entityBadgeColors}`}>
            {diff.entity}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${opBadgeColors}`}>
            {diff.op}
          </span>
        </div>

        <div className="text-[11px] font-mono text-stone-500">
          {status === 'pending' && <span className="text-amber-600 font-semibold">Pending Approval</span>}
          {status === 'accepted' && <span className="text-emerald-700 font-semibold">✓ Applied</span>}
          {status === 'undone' && <span className="text-stone-500">↩ Reverted</span>}
        </div>
      </div>

      <p className="font-medium text-stone-900 mb-3 text-xs leading-relaxed">
        {diff.summary}
      </p>

      {/* Visual comparison of before / after */}
      {diff.op === 'update' && diff.before && diff.after && (
        <div className="mb-3 p-2.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1 font-mono text-[11px]">
          {diff.entity === 'budget' && (
            <div className="flex justify-between">
              <span className="text-stone-500 line-through">₹{diff.before.allocatedAmount.toLocaleString('en-IN')}</span>
              <span className="text-emerald-700 font-bold">→ ₹{diff.after.allocatedAmount.toLocaleString('en-IN')}</span>
            </div>
          )}
          {diff.entity === 'task' && (
            <div className="flex justify-between">
              <span className="text-stone-500 line-through">T-{diff.before.leadDays}d ({diff.before.status})</span>
              <span className="text-blue-700 font-bold">→ T-{diff.after.leadDays}d ({diff.after.status})</span>
            </div>
          )}
        </div>
      )}

      {diff.op === 'create' && diff.after && (
        <div className="mb-3 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 font-mono text-[11px] text-emerald-900">
          {diff.entity === 'task' && (
            <div>+ Task: {diff.after.title} (T-{diff.after.leadDays}d, {diff.after.priority})</div>
          )}
          {diff.entity === 'vendor' && (
            <div>+ Vendor: {diff.after.name} ({diff.after.category}, ₹{diff.after.quotedAmount.toLocaleString('en-IN')})</div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
        {status === 'pending' && (
          <button
            onClick={() => onAccept(proposal)}
            disabled={isProcessing}
            aria-label={`Accept proposal: ${diff.summary}`}
            className="flex-1 py-1.5 px-3 rounded-lg font-semibold bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition-all text-xs disabled:opacity-50 focus:ring-2 focus:ring-festive-marigold"
          >
            Accept
          </button>
        )}

        {status === 'accepted' && (
          <button
            onClick={() => onUndo(proposal)}
            disabled={isProcessing}
            aria-label={`Undo proposal: ${diff.summary}`}
            className="flex-1 py-1.5 px-3 rounded-lg font-semibold bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 transition-all text-xs disabled:opacity-50 focus:ring-2 focus:ring-stone-400"
          >
            Undo Change
          </button>
        )}
      </div>
    </div>
  );
};
