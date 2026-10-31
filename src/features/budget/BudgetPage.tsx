import React from 'react';
import { useEventStore } from '../../stores/eventStore';
import { budgetSummary } from '../../domain/budgetSummary';
import { WhatIfSimulator } from './WhatIfSimulator';
import { BudgetItem } from '../../types/event.types';
import { EmptyState } from '../../components/common/States';

export const BudgetPage: React.FC = () => {
  const { currentEvent, budgetItems, updateBudgetItem, updateBudgetItemsList, setActiveView } = useEventStore();

  if (!currentEvent) {
    return (
      <EmptyState
        title="No Celebration Selected"
        description="Select an existing celebration from the dashboard or create a new blueprint."
        actionLabel="Go to Blueprint"
        onAction={() => setActiveView('blueprint')}
        icon="account_balance_wallet"
      />
    );
  }

  const summary = budgetSummary(budgetItems);

  const handleCellEdit = (
    item: BudgetItem,
    field: 'allocatedAmount' | 'actualAmount' | 'paidAmount',
    valStr: string
  ) => {
    const parsed = parseInt(valStr.replace(/[^0-9]/g, ''), 10);
    const amount = isNaN(parsed) ? 0 : parsed;
    void updateBudgetItem(item.id, { [field]: amount });
  };

  const handleToggleLock = (item: BudgetItem) => {
    void updateBudgetItem(item.id, { isLocked: !item.isLocked });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-stone-900">
          Budget Planner & Tracking
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          Monitor planned vs actual spending with zero-leakage integer rupee accounting.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-utsav-200 shadow-sm">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Allocated</span>
          <div className="text-2xl font-bold font-mono text-stone-900 mt-1">
            ₹{summary.totalAllocated.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-stone-400">Total planned cap</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-utsav-200 shadow-sm">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Actual Spent</span>
          <div className="text-2xl font-bold font-mono text-festive-marigold mt-1">
            ₹{summary.totalActual.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-stone-400">Contracted / committed</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-utsav-200 shadow-sm">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Paid Out</span>
          <div className="text-2xl font-bold font-mono text-green-700 mt-1">
            ₹{summary.totalPaid.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-stone-400">Advances & settlements</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-utsav-200 shadow-sm">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Remaining</span>
          <div
            className={`text-2xl font-bold font-mono mt-1 ${
              summary.totalRemaining < 0 ? 'text-red-600' : 'text-stone-900'
            }`}
          >
            ₹{summary.totalRemaining.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-stone-400">
            {summary.totalRemaining < 0 ? 'Over budget' : 'Available buffer'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-utsav-200 shadow-sm col-span-2 lg:col-span-1">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Burn Rate</span>
          <div className="text-2xl font-bold font-mono text-stone-900 mt-1">
            {summary.burnPercentage}%
          </div>
          <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full ${
                summary.burnPercentage > 90
                  ? 'bg-red-500'
                  : summary.burnPercentage > 75
                  ? 'bg-amber-500'
                  : 'bg-festive-marigold'
              }`}
              style={{ width: `${Math.min(100, summary.burnPercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* What-If Simulator Component */}
      <WhatIfSimulator
        items={budgetItems}
        currentTotal={summary.totalAllocated}
        guestCount={currentEvent.guestCount}
        onApply={async (rebalanced) => {
          await updateBudgetItemsList(rebalanced);
        }}
      />

      {/* Editable Line Items Table */}
      <div className="bg-white rounded-2xl border border-utsav-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-utsav-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900">Line Items & Allocations</h2>
          <span className="text-xs text-stone-500 font-medium">Click on amounts to edit inline</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold">
              <tr>
                <th scope="col" className="px-6 py-3">Category / Item</th>
                <th scope="col" className="px-4 py-3 text-right">Planned (₹)</th>
                <th scope="col" className="px-4 py-3 text-right">Actual (₹)</th>
                <th scope="col" className="px-4 py-3 text-right">Paid (₹)</th>
                <th scope="col" className="px-4 py-3 text-right">Variance</th>
                <th scope="col" className="px-4 py-3 text-center">Lock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {budgetItems.map((item: BudgetItem) => {
                const variance = item.allocatedAmount - item.actualAmount;
                return (
                  <tr key={item.id} className="hover:bg-utsav-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-stone-900">{item.name}</div>
                      <div className="text-[11px] text-stone-400 capitalize">{item.category}</div>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <input
                        type="text"
                        aria-label={`Allocated amount for ${item.name}`}
                        defaultValue={item.allocatedAmount}
                        onBlur={(e) => handleCellEdit(item, 'allocatedAmount', e.target.value)}
                        className="w-28 text-right font-mono text-xs px-2 py-1 rounded border border-stone-200 focus:outline-none focus:ring-1 focus:ring-festive-marigold"
                      />
                    </td>

                    <td className="px-4 py-4 text-right">
                      <input
                        type="text"
                        aria-label={`Actual amount for ${item.name}`}
                        defaultValue={item.actualAmount}
                        onBlur={(e) => handleCellEdit(item, 'actualAmount', e.target.value)}
                        className="w-28 text-right font-mono text-xs px-2 py-1 rounded border border-stone-200 focus:outline-none focus:ring-1 focus:ring-festive-marigold text-festive-marigold font-medium"
                      />
                    </td>

                    <td className="px-4 py-4 text-right">
                      <input
                        type="text"
                        aria-label={`Paid amount for ${item.name}`}
                        defaultValue={item.paidAmount}
                        onBlur={(e) => handleCellEdit(item, 'paidAmount', e.target.value)}
                        className="w-28 text-right font-mono text-xs px-2 py-1 rounded border border-stone-200 focus:outline-none focus:ring-1 focus:ring-festive-marigold text-green-700 font-medium"
                      />
                    </td>

                    <td className="px-4 py-4 text-right font-mono font-medium">
                      <span className={variance < 0 ? 'text-red-600' : 'text-stone-600'}>
                        {variance < 0 ? `-₹${Math.abs(variance).toLocaleString('en-IN')}` : `+₹${variance.toLocaleString('en-IN')}`}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleToggleLock(item)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          item.isLocked
                            ? 'bg-stone-800 text-amber-300 border-stone-800'
                            : 'bg-white text-stone-400 border-stone-200 hover:text-stone-700'
                        }`}
                        title={item.isLocked ? 'Locked from auto-rebalance' : 'Unlocked'}
                        aria-label={`Toggle lock for ${item.name}`}
                      >
                        {item.isLocked ? '🔒' : '🔓'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BudgetPage;
