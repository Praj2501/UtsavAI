import {
  BudgetItem,
  Event,
  PublicEvent,
  Rsvp,
  RunSheetItem,
  Task,
  Vendor,
} from '../types/event.types';
import { AnyEntityDiff } from '../types/diff.types';
import { AppError, Result } from '../types/result.types';

export interface EventRepository {
  /**
   * Atomically creates an event, publicEvent record, and initial subcollections.
   */
  createEventWithPlan(
    event: Event,
    budgetItems: BudgetItem[],
    tasks: Task[],
    vendors: Vendor[]
  ): Promise<Result<void, AppError>>;

  getEvent(eventId: string): Promise<Result<Event | null, AppError>>;
  getPublicEvent(eventId: string): Promise<Result<PublicEvent | null, AppError>>;
  getBudgetItems(eventId: string): Promise<Result<BudgetItem[], AppError>>;
  getTasks(eventId: string): Promise<Result<Task[], AppError>>;
  getVendors(eventId: string): Promise<Result<Vendor[], AppError>>;
  getRsvps(eventId: string): Promise<Result<Rsvp[], AppError>>;
  getRunSheetItems(eventId: string): Promise<Result<RunSheetItem[], AppError>>;

  /**
   * Applies an accepted AI diff or manual mutation to an entity.
   */
  applyEntityDiff(eventId: string, diff: AnyEntityDiff): Promise<Result<void, AppError>>;

  /**
   * Updates multiple budget items in batch.
   */
  saveBudgetItems(eventId: string, items: BudgetItem[]): Promise<Result<void, AppError>>;

  /**
   * Creates a public guest RSVP record.
   */
  createRsvp(
    eventId: string,
    rsvp: Omit<Rsvp, 'id' | 'createdAt'>
  ): Promise<Result<string, AppError>>;

  /**
   * Realtime listeners with unsubscribe callbacks.
   */
  subscribeToEvent(eventId: string, callback: (event: Event | null) => void): () => void;
  subscribeToBudget(eventId: string, callback: (items: BudgetItem[]) => void): () => void;
  subscribeToTasks(eventId: string, callback: (tasks: Task[]) => void): () => void;
  subscribeToVendors(eventId: string, callback: (vendors: Vendor[]) => void): () => void;
  subscribeToRsvps(eventId: string, callback: (rsvps: Rsvp[]) => void): () => void;
}
