import { BudgetItem } from '../types/event.types';

export interface CategorySummary {
  category: string;
  allocated: number;
  actual: number;
  paid: number;
  itemCount: number;
}

export interface BudgetSummary {
  totalAllocated: number;
  totalActual: number;
  totalPaid: number;
  totalRemaining: number;
  burnPercentage: number;
  categories: CategorySummary[];
}

/**
 * Aggregates budget financial figures across all items and individual categories.
 *
 * @param items - List of budget line items.
 * @returns Aggregated budget metrics and per-category breakdown.
 */
export function budgetSummary(items: BudgetItem[]): BudgetSummary {
  let totalAllocated = 0;
  let totalActual = 0;
  let totalPaid = 0;

  const categoryMap = new Map<string, { allocated: number; actual: number; paid: number; count: number }>();

  for (const item of items) {
    totalAllocated += item.allocatedAmount;
    totalActual += item.actualAmount;
    totalPaid += item.paidAmount;

    const current = categoryMap.get(item.category) ?? { allocated: 0, actual: 0, paid: 0, count: 0 };
    categoryMap.set(item.category, {
      allocated: current.allocated + item.allocatedAmount,
      actual: current.actual + item.actualAmount,
      paid: current.paid + item.paidAmount,
      count: current.count + 1,
    });
  }

  const totalRemaining = totalAllocated - totalActual;
  const burnPercentage = totalAllocated > 0
    ? Math.min(100, Math.round((totalActual / totalAllocated) * 100))
    : 0;

  const categories: CategorySummary[] = Array.from(categoryMap.entries()).map(
    ([category, stats]) => ({
      category,
      allocated: stats.allocated,
      actual: stats.actual,
      paid: stats.paid,
      itemCount: stats.count,
    })
  );

  return {
    totalAllocated,
    totalActual,
    totalPaid,
    totalRemaining,
    burnPercentage,
    categories,
  };
}
