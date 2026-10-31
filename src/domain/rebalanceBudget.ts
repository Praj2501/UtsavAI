import { BudgetItem } from '../types/event.types';
import { AppError, Result, err, ok } from '../types/result.types';

export interface RebalanceOptions {
  lockedIds?: Set<string> | string[];
}

/**
 * Deterministically rebalances category allocations to match a new total in integer rupees.
 * Uses the Largest Remainder Method (Hamilton-Hare) to guarantee:
 *  1. Every allocation is an integer rupee >= 0
 *  2. The sum of all allocated amounts strictly equals newTotal
 *  3. Locked categories maintain their exact values
 *
 * @param items - Existing budget items.
 * @param newTotal - Target budget total in whole rupees.
 * @param options - Optional locked item IDs that must remain fixed.
 * @returns Result with rebalanced items or AppError if constraints cannot be satisfied.
 */
export function rebalanceBudget(
  items: BudgetItem[],
  newTotal: number,
  options?: RebalanceOptions
): Result<BudgetItem[], AppError> {
  if (!Number.isInteger(newTotal) || newTotal < 0) {
    return err({
      code: 'budget/invalid-total',
      message: 'New total budget must be a non-negative integer rupee amount',
    });
  }

  if (items.length === 0) {
    return ok([]);
  }

  const lockedSet = new Set<string>(
    options?.lockedIds instanceof Set
      ? options.lockedIds
      : (options?.lockedIds ?? []).map(id => String(id))
  );

  // Split into locked and unlocked
  let lockedSum = 0;
  for (const item of items) {
    if (item.isLocked || lockedSet.has(item.id)) {
      lockedSum += Math.max(0, Math.round(item.allocatedAmount));
    }
  }

  if (lockedSum > newTotal) {
    return err({
      code: 'budget/locked-exceeds-total',
      message: `Locked categories sum (₹${lockedSum}) exceeds the target budget (₹${newTotal})`,
    });
  }

  const remainingBudget = newTotal - lockedSum;
  const unlockedItems = items.filter(i => !i.isLocked && !lockedSet.has(i.id));

  if (unlockedItems.length === 0) {
    // Only locked items exist
    if (lockedSum !== newTotal) {
      return err({
        code: 'budget/all-items-locked-mismatch',
        message: `All items are locked with total ₹${lockedSum}, cannot rebalance to ₹${newTotal}`,
      });
    }
    return ok(items);
  }

  const currentUnlockedSum = unlockedItems.reduce((acc, i) => acc + Math.max(0, i.allocatedAmount), 0);

  // Compute unrounded allocations and fractional remainders
  const allocationsWithRemainder = unlockedItems.map(item => {
    const ratio = currentUnlockedSum > 0
      ? Math.max(0, item.allocatedAmount) / currentUnlockedSum
      : 1 / unlockedItems.length;

    const exactAllocation = remainingBudget * ratio;
    const floorAllocation = Math.floor(exactAllocation);
    const remainder = exactAllocation - floorAllocation;

    return {
      item,
      floorAllocation,
      remainder,
    };
  });

  const baseAllocatedSum = allocationsWithRemainder.reduce((acc, cur) => acc + cur.floorAllocation, 0);
  let distributedRemainder = remainingBudget - baseAllocatedSum;

  // Sort by remainder descending, then item ID for stability
  allocationsWithRemainder.sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }
    return a.item.id.localeCompare(b.item.id);
  });

  const finalAllocationsMap = new Map<string, number>();

  for (const entry of allocationsWithRemainder) {
    let finalAmount = entry.floorAllocation;
    if (distributedRemainder > 0) {
      finalAmount += 1;
      distributedRemainder -= 1;
    }
    finalAllocationsMap.set(entry.item.id, finalAmount);
  }

  const rebalanced = items.map(item => {
    const isLocked = item.isLocked || lockedSet.has(item.id);
    const allocatedAmount = isLocked
      ? Math.max(0, Math.round(item.allocatedAmount))
      : (finalAllocationsMap.get(item.id) ?? 0);

    return {
      ...item,
      allocatedAmount,
    };
  });

  return ok(rebalanced);
}
