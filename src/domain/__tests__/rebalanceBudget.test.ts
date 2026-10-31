import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { rebalanceBudget } from '../rebalanceBudget';
import { BudgetItem } from '../../types/event.types';

describe('rebalanceBudget', () => {
  const sampleItems: BudgetItem[] = [
    { id: '1', category: 'Venue', name: 'Lawn', allocatedAmount: 300000, actualAmount: 0, paidAmount: 0, status: 'pending', isLocked: false, rationale: '' },
    { id: '2', category: 'Catering', name: 'Feast', allocatedAmount: 350000, actualAmount: 0, paidAmount: 0, status: 'pending', isLocked: false, rationale: '' },
    { id: '3', category: 'Decor', name: 'Flowers', allocatedAmount: 150000, actualAmount: 0, paidAmount: 0, status: 'pending', isLocked: false, rationale: '' },
    { id: '4', category: 'Photo', name: 'Video', allocatedAmount: 100000, actualAmount: 0, paidAmount: 0, status: 'pending', isLocked: false, rationale: '' },
  ];

  it('deterministically rebalances to new total with exact rupee sum equality', () => {
    const res = rebalanceBudget(sampleItems, 1200000);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const sum = res.value.reduce((acc, i) => acc + i.allocatedAmount, 0);
    expect(sum).toBe(1200000);
    expect(res.value.every(i => Number.isInteger(i.allocatedAmount) && i.allocatedAmount >= 0)).toBe(true);
  });

  it('preserves locked items exactly', () => {
    const itemsWithLock: BudgetItem[] = [
      { ...sampleItems[0]!, isLocked: true, allocatedAmount: 250000 },
      { ...sampleItems[1]! },
      { ...sampleItems[2]! },
    ];

    const res = rebalanceBudget(itemsWithLock, 800000);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const lockedItem = res.value.find(i => i.id === '1');
    expect(lockedItem?.allocatedAmount).toBe(250000);

    const sum = res.value.reduce((acc, i) => acc + i.allocatedAmount, 0);
    expect(sum).toBe(800000);
  });

  it('returns error when locked items sum exceeds newTotal', () => {
    const itemsWithLock: BudgetItem[] = [
      { ...sampleItems[0]!, isLocked: true, allocatedAmount: 600000 },
      { ...sampleItems[1]!, isLocked: true, allocatedAmount: 500000 },
    ];

    const res = rebalanceBudget(itemsWithLock, 1000000);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('budget/locked-exceeds-total');
    }
  });

  it('handles zero budget safely', () => {
    const res = rebalanceBudget(sampleItems, 0);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.every(i => i.allocatedAmount === 0)).toBe(true);
  });

  it('rejects invalid or negative newTotal amounts', () => {
    const resNegative = rebalanceBudget(sampleItems, -100);
    expect(resNegative.ok).toBe(false);

    const resFloat = rebalanceBudget(sampleItems, 12000.5);
    expect(resFloat.ok).toBe(false);
  });

  it('handles all items locked mismatch and match', () => {
    const allLocked: BudgetItem[] = [
      { ...sampleItems[0]!, isLocked: true, allocatedAmount: 300000 },
    ];
    // Exact match
    const resMatch = rebalanceBudget(allLocked, 300000);
    expect(resMatch.ok).toBe(true);

    // Mismatch
    const resMismatch = rebalanceBudget(allLocked, 400000);
    expect(resMismatch.ok).toBe(false);
  });

  // Fast-check property-based tests
  it('property: sum invariant and non-negativity across 100+ random configurations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            category: fc.string({ minLength: 1, maxLength: 20 }),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            allocatedAmount: fc.integer({ min: 0, max: 1000000 }),
            actualAmount: fc.constant(0),
            paidAmount: fc.constant(0),
            status: fc.constant('pending' as const),
            isLocked: fc.boolean(),
            rationale: fc.constant(''),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.integer({ min: 0, max: 5000000 }),
        (items, targetBudget) => {
          const lockedSum = items
            .filter(i => i.isLocked)
            .reduce((s, i) => s + i.allocatedAmount, 0);
          const hasUnlocked = items.some(i => !i.isLocked);

          const result = rebalanceBudget(items, targetBudget);

          if (lockedSum > targetBudget || (!hasUnlocked && lockedSum !== targetBudget)) {
            expect(result.ok).toBe(false);
          } else {
            expect(result.ok).toBe(true);
            if (result.ok) {
              const sum = result.value.reduce((s, i) => s + i.allocatedAmount, 0);
              expect(sum).toBe(targetBudget);
              expect(result.value.every(i => Number.isInteger(i.allocatedAmount) && i.allocatedAmount >= 0)).toBe(true);

              // Check locked categories
              result.value.forEach(item => {
                const original = items.find(orig => orig.id === item.id);
                if (original?.isLocked) {
                  expect(item.allocatedAmount).toBe(original.allocatedAmount);
                }
              });
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
