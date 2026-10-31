import { EventRepository } from './EventRepository.interface';
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
import { AppError, Result, err, ok } from '../types/result.types';
import { applyDiff } from '../domain/diffEngine';

export class InMemoryEventRepository implements EventRepository {
  private events = new Map<string, Event>();
  private publicEvents = new Map<string, PublicEvent>();
  private budgetItems = new Map<string, BudgetItem[]>();
  private tasks = new Map<string, Task[]>();
  private vendors = new Map<string, Vendor[]>();
  private rsvps = new Map<string, Rsvp[]>();
  private runSheetItems = new Map<string, RunSheetItem[]>();

  public async createEventWithPlan(
    event: Event,
    budgetItems: BudgetItem[],
    tasks: Task[],
    vendors: Vendor[]
  ): Promise<Result<void, AppError>> {
    this.events.set(event.id, { ...event });
    this.publicEvents.set(event.id, {
      id: event.id,
      title: event.title,
      date: event.date,
      city: event.city,
    });
    this.budgetItems.set(event.id, [...budgetItems]);
    this.tasks.set(event.id, [...tasks]);
    this.vendors.set(event.id, [...vendors]);
    this.rsvps.set(event.id, []);
    this.runSheetItems.set(event.id, []);
    return ok(undefined);
  }

  public async getEvent(eventId: string): Promise<Result<Event | null, AppError>> {
    return ok(this.events.get(eventId) ?? null);
  }

  public async getPublicEvent(eventId: string): Promise<Result<PublicEvent | null, AppError>> {
    return ok(this.publicEvents.get(eventId) ?? null);
  }

  public async getBudgetItems(eventId: string): Promise<Result<BudgetItem[], AppError>> {
    return ok(this.budgetItems.get(eventId) ?? []);
  }

  public async getTasks(eventId: string): Promise<Result<Task[], AppError>> {
    return ok(this.tasks.get(eventId) ?? []);
  }

  public async getVendors(eventId: string): Promise<Result<Vendor[], AppError>> {
    return ok(this.vendors.get(eventId) ?? []);
  }

  public async getRsvps(eventId: string): Promise<Result<Rsvp[], AppError>> {
    return ok(this.rsvps.get(eventId) ?? []);
  }

  public async getRunSheetItems(eventId: string): Promise<Result<RunSheetItem[], AppError>> {
    return ok(this.runSheetItems.get(eventId) ?? []);
  }

  public async applyEntityDiff(eventId: string, diff: AnyEntityDiff): Promise<Result<void, AppError>> {
    switch (diff.entity) {
      case 'budget': {
        const current = this.budgetItems.get(eventId) ?? [];
        const res = applyDiff(current, diff);
        if (!res.ok) return res;
        this.budgetItems.set(eventId, res.value);
        return ok(undefined);
      }
      case 'task': {
        const current = this.tasks.get(eventId) ?? [];
        const res = applyDiff(current, diff);
        if (!res.ok) return res;
        this.tasks.set(eventId, res.value);
        return ok(undefined);
      }
      case 'vendor': {
        const current = this.vendors.get(eventId) ?? [];
        const res = applyDiff(current, diff);
        if (!res.ok) return res;
        this.vendors.set(eventId, res.value);
        return ok(undefined);
      }
    }
  }

  public async saveBudgetItems(eventId: string, items: BudgetItem[]): Promise<Result<void, AppError>> {
    this.budgetItems.set(eventId, [...items]);
    return ok(undefined);
  }

  public async createRsvp(
    eventId: string,
    rsvpInput: Omit<Rsvp, 'id' | 'createdAt'>
  ): Promise<Result<string, AppError>> {
    if (!this.events.has(eventId)) {
      return err({
        code: 'rsvp/event-not-found',
        message: `Event "${eventId}" does not exist`,
      });
    }

    const rsvpId = `rsvp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newRsvp: Rsvp = {
      ...rsvpInput,
      id: rsvpId,
      createdAt: new Date().toISOString(),
    };

    const current = this.rsvps.get(eventId) ?? [];
    this.rsvps.set(eventId, [...current, newRsvp]);
    return ok(rsvpId);
  }

  public subscribeToEvent(eventId: string, callback: (event: Event | null) => void): () => void {
    callback(this.events.get(eventId) ?? null);
    return () => {};
  }

  public subscribeToBudget(eventId: string, callback: (items: BudgetItem[]) => void): () => void {
    callback(this.budgetItems.get(eventId) ?? []);
    return () => {};
  }

  public subscribeToTasks(eventId: string, callback: (tasks: Task[]) => void): () => void {
    callback(this.tasks.get(eventId) ?? []);
    return () => {};
  }

  public subscribeToVendors(eventId: string, callback: (vendors: Vendor[]) => void): () => void {
    callback(this.vendors.get(eventId) ?? []);
    return () => {};
  }

  public subscribeToRsvps(eventId: string, callback: (rsvps: Rsvp[]) => void): () => void {
    callback(this.rsvps.get(eventId) ?? []);
    return () => {};
  }
}
