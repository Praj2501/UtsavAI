/**
 * Discriminated union diff engine types for AI Copilot proposals.
 */

import { BudgetItem, Task, Vendor } from './event.types';

export type DiffEntity = 'budget' | 'task' | 'vendor';
export type DiffOp = 'create' | 'update' | 'delete';

export interface BudgetDiff {
  entity: 'budget';
  op: DiffOp;
  id: string;
  before?: BudgetItem;
  after?: BudgetItem;
  summary: string;
}

export interface TaskDiff {
  entity: 'task';
  op: DiffOp;
  id: string;
  before?: Task;
  after?: Task;
  summary: string;
}

export interface VendorDiff {
  entity: 'vendor';
  op: DiffOp;
  id: string;
  before?: Vendor;
  after?: Vendor;
  summary: string;
}

export type AnyEntityDiff = BudgetDiff | TaskDiff | VendorDiff;

export interface DiffProposal {
  id: string;
  timestamp: number;
  diff: AnyEntityDiff;
  status: 'pending' | 'accepted' | 'undone' | 'rejected';
}
