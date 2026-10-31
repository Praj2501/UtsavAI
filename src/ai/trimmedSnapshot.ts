import { BudgetItem, Event, Task, Vendor } from '../types/event.types';

export interface TrimmedBudgetItem {
  id: string;
  category: string;
  name: string;
  allocatedAmount: number;
  actualAmount: number;
  status: string;
}

export interface TrimmedTask {
  id: string;
  title: string;
  category: string;
  leadDays: number;
  status: string;
  priority: string;
}

export interface TrimmedVendor {
  id: string;
  category: string;
  name: string;
  quotedAmount: number;
  status: string;
}

export interface TrimmedPlanSnapshot {
  eventId: string;
  title: string;
  eventType: string;
  date: string;
  city: string;
  guestCount: number;
  totalBudget: number;
  budgetItems: TrimmedBudgetItem[];
  tasks: TrimmedTask[];
  vendors: TrimmedVendor[];
}

export function trimBudgetForAi(budgetItems: BudgetItem[]): TrimmedBudgetItem[] {
  return budgetItems.map((b) => ({
    id: b.id,
    category: b.category,
    name: b.name,
    allocatedAmount: b.allocatedAmount,
    actualAmount: b.actualAmount,
    status: b.status,
  }));
}

/**
 * Builds a lean, minimal plan snapshot for AI Copilot context injection.
 * Strips verbose internal fields, large timestamps, and private data to optimize token efficiency.
 */
export function buildTrimmedPlanSnapshot(
  event: Event,
  budgetItems: BudgetItem[],
  tasks: Task[],
  vendors: Vendor[]
): TrimmedPlanSnapshot {
  return {
    eventId: event.id,
    title: event.title,
    eventType: event.eventType,
    date: event.date,
    city: event.city,
    guestCount: event.guestCount,
    totalBudget: event.totalBudget,
    budgetItems: budgetItems.map(b => ({
      id: b.id,
      category: b.category,
      name: b.name,
      allocatedAmount: b.allocatedAmount,
      actualAmount: b.actualAmount,
      status: b.status,
    })),
    tasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      category: t.category,
      leadDays: t.leadDays,
      status: t.status,
      priority: t.priority,
    })),
    vendors: vendors.map(v => ({
      id: v.id,
      category: v.category,
      name: v.name,
      quotedAmount: v.quotedAmount,
      status: v.status,
    })),
  };
}
