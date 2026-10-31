import React, { useState } from 'react';
import { BudgetItem } from '../../types/event.types';
import { rebalanceBudget } from '../../domain/rebalanceBudget';
import { getAiProvider } from '../../ai/providers';
import { whatIfPromptV1 } from '../../ai/prompts/whatIf.v1';
import { WhatIfOutput, WhatIfOutputSchema } from '../../ai/schemas/whatIf.schema';
import { trimBudgetForAi } from '../../ai/trimmedSnapshot';

interface WhatIfSimulatorProps {
  items: BudgetItem[];
  currentTotal: number;
  guestCount: number;
  onApply: (rebalancedItems: BudgetItem[]) => Promise<void> | void;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  items,
  currentTotal,
  guestCount,
  onApply,
}) => {
  const [targetBudget, setTargetBudget] = useState<number>(currentTotal);
  const [targetGuests, setTargetGuests] = useState<number>(guestCount);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiRationale, setAiRationale] = useState<string | null>(null);
  const [simulatedItems, setSimulatedItems] = useState<BudgetItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = (newBudget: number) => {
    setTargetBudget(newBudget);
    setError(null);
    const lockedIds = items.filter((i) => i.isLocked).map((i) => i.id);
    const result = rebalanceBudget(items, newBudget, { lockedIds });
    if (result.ok) {
      setSimulatedItems(result.value);
    } else {
      setError(result.error.message);
      setSimulatedItems(null);
    }
  };

  const handleAiSuggest = async () => {
    setIsAiLoading(true);
    setError(null);
    try {
      const provider = getAiProvider();
      const prompt = whatIfPromptV1.build({
        currentTotal,
        newTotal: targetBudget,
        guestCount,
        newGuestCount: targetGuests,
        currentItems: trimBudgetForAi(items),
      });

      const response = await provider.generateStructured<WhatIfOutput>(
        prompt,
        WhatIfOutputSchema
      );

      if (!response.ok) {
        setError(response.error.message);
        return;
      }

      setAiRationale(response.value.summaryRationale);

      // Rebalance deterministically using domain logic with exact integer rupee guarantee
      const lockedIds = items.filter((i) => i.isLocked).map((i) => i.id);
      const result = rebalanceBudget(items, targetBudget, { lockedIds });
      if (result.ok) {
        setSimulatedItems(result.value);
      } else {
        setError(result.error.message);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate AI rebalance suggestions';
      setError(message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApply = async () => {
    if (!simulatedItems) return;
    await onApply(simulatedItems);
    setSimulatedItems(null);
    setAiRationale(null);
  };

  const delta = targetBudget - currentTotal;
  const simulatedSum = simulatedItems
    ? simulatedItems.reduce((acc, it) => acc + it.allocatedAmount, 0)
    : targetBudget;

  return (
    <div className="bg-white rounded-2xl border border-utsav-200 p-6 shadow-sm mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-utsav-100">
        <div>
          <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <span>What-If Budget Simulator</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-festive-cream text-festive-marigold border border-festive-marigold/20">
              Deterministic Math + AI Insights
            </span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Simulate scaling budget and headcount. The pure domain engine guarantees exact rupee totals.
          </p>
        </div>
        <button
          onClick={handleAiSuggest}
          disabled={isAiLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-festive-marigold to-festive-gold text-white shadow-sm hover:opacity-95 transition-all disabled:opacity-50"
        >
          {isAiLoading ? 'Analyzing tradeoffs...' : 'AI Suggest Rebalance'}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      {aiRationale && (
        <div className="mt-4 p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-stone-800">
          <p className="font-semibold text-amber-900 mb-1">AI Strategic Tradeoff Analysis:</p>
          <p>{aiRationale}</p>
        </div>
      )}

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <div className="flex justify-between items-center text-xs font-semibold text-stone-700 mb-2">
            <label htmlFor="budget-slider">Target Total Budget</label>
            <span className="font-mono text-sm text-festive-marigold font-bold">
              ₹{targetBudget.toLocaleString('en-IN')}
            </span>
          </div>
          <input
            id="budget-slider"
            type="range"
            min={Math.max(10000, Math.round(currentTotal * 0.3))}
            max={Math.round(currentTotal * 2.5)}
            step={5000}
            value={targetBudget}
            onChange={(e) => handleSimulate(Number(e.target.value))}
            className="w-full accent-festive-marigold cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-stone-400 mt-1">
            <span>Min: ₹{Math.max(10000, Math.round(currentTotal * 0.3)).toLocaleString('en-IN')}</span>
            <span className={delta >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
              {delta >= 0 ? `+₹${delta.toLocaleString('en-IN')}` : `-₹${Math.abs(delta).toLocaleString('en-IN')}`}
            </span>
            <span>Max: ₹{Math.round(currentTotal * 2.5).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center text-xs font-semibold text-stone-700 mb-2">
            <label htmlFor="guest-slider">Estimated Guest Count</label>
            <span className="font-mono text-sm text-stone-900 font-bold">{targetGuests} guests</span>
          </div>
          <input
            id="guest-slider"
            type="range"
            min={10}
            max={1500}
            step={10}
            value={targetGuests}
            onChange={(e) => setTargetGuests(Number(e.target.value))}
            className="w-full accent-stone-700 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-stone-400 mt-1">
            <span>10</span>
            <span>Current: {guestCount}</span>
            <span>1500</span>
          </div>
        </div>
      </div>

      {/* Simulated Preview & Commit */}
      {simulatedItems && (
        <div className="mt-6 pt-5 border-t border-utsav-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-stone-600">
            Previewing rebalance for <span className="font-semibold">{simulatedItems.length}</span> categories.
            Total sum check: <span className="font-mono font-bold text-stone-900">₹{simulatedSum.toLocaleString('en-IN')}</span>
            {simulatedSum === targetBudget ? (
              <span className="ml-2 text-green-600 font-medium">(Exact match)</span>
            ) : (
              <span className="ml-2 text-red-500 font-medium">(Mismatch)</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSimulatedItems(null);
                setTargetBudget(currentTotal);
                setTargetGuests(guestCount);
                setAiRationale(null);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg border border-stone-200 hover:bg-stone-50"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-sm transition-all"
            >
              Apply Rebalanced Budget
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
