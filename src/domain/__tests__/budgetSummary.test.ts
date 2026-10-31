import { describe, it, expect } from 'vitest';
import { budgetSummary } from '../budgetSummary';
import { BudgetItem } from '../../types/event.types';

describe('budgetSummary', () => {
  it('aggregates budget numbers and burn percentage accurately', () => {
    const items: BudgetItem[] = [
      { id: '1', category: 'Venue', name: 'Lawn', allocatedAmount: 300000, actualAmount: 280000, paidAmount: 150000, status: 'partial', isLocked: false, rationale: '' },
      { id: '2', category: 'Catering', name: 'Dinner', allocatedAmount: 200000, actualAmount: 220000, paidAmount: 220000, status: 'paid', isLocked: false, rationale: '' },
    ];

    const summary = budgetSummary(items);
    expect(summary.totalAllocated).toBe(500000);
    expect(summary.totalActual).toBe(500000);
    expect(summary.totalPaid).toBe(370000);
    expect(summary.totalRemaining).toBe(0);
    expect(summary.burnPercentage).toBe(100);
    expect(summary.categories.length).toBe(2);
  });

  it('handles empty item list cleanly', () => {
    const summary = budgetSummary([]);
    expect(summary.totalAllocated).toBe(0);
    expect(summary.totalActual).toBe(0);
    expect(summary.burnPercentage).toBe(0);
    expect(summary.categories).toEqual([]);
  });
});
