import { create } from 'zustand';
import { Event, BudgetItem, Task, Vendor, Rsvp } from '../types/event.types';
import { AnyEntityDiff } from '../types/diff.types';
import { AppError, Result, err, ok } from '../types/result.types';
import { getEventRepository } from '../repositories';
import { PUNE_HERO_BLUEPRINT } from '../ai/providers/MockAiProvider';
import { reverseSchedule } from '../domain/reverseSchedule';
import { applyDiff, revertDiff } from '../domain/diffEngine';

type ActiveView = 'landing' | 'blueprint' | 'dashboard' | 'budget' | 'timeline' | 'vendors' | 'rsvp' | 'content' | 'runsheet';

interface EventState {
  currentEvent: Event | null;
  budgetItems: BudgetItem[];
  tasks: Task[];
  vendors: Vendor[];
  rsvps: Rsvp[];
  isLoading: boolean;
  error: string | null;
  activeView: ActiveView;

  setActiveView: (view: ActiveView) => void;
  loadEvent: (eventId: string) => Promise<void>;
  loadDemoScenario: () => Promise<void>;
  setEventData: (data: {
    event: Event;
    budgetItems: BudgetItem[];
    tasks: Task[];
    vendors: Vendor[];
  }) => void;
  updateBudgetItem: (itemId: string, patch: Partial<BudgetItem>) => Promise<void>;
  updateBudgetItemsList: (items: BudgetItem[]) => Promise<void>;
  updateTaskStatus: (taskId: string, status: Task['status']) => Promise<void>;
  updateVendorStatus: (vendorId: string, status: Vendor['status']) => Promise<void>;
  addVendor: (vendor: Vendor) => Promise<void>;
  addRsvp: (rsvp: Omit<Rsvp, 'id' | 'createdAt'>) => Promise<void>;
  toggleVendorChecklistItem: (categoryIndex: number, itemIndex: number) => Promise<void>;
  applyDiffToStore: (diff: AnyEntityDiff) => Promise<Result<void, AppError>>;
  revertDiffInStore: (diff: AnyEntityDiff) => Promise<Result<void, AppError>>;
}

export const useEventStore = create<EventState>((set, get) => ({
  currentEvent: null,
  budgetItems: [],
  tasks: [],
  vendors: [],
  rsvps: [],
  isLoading: false,
  error: null,
  activeView: 'landing',

  setActiveView: (view) => set({ activeView: view }),

  loadEvent: async (eventId: string) => {
    set({ isLoading: true, error: null });
    const repo = getEventRepository();
    const eventRes = await repo.getEvent(eventId);
    if (!eventRes.ok || !eventRes.value) {
      set({ isLoading: false, error: 'Event not found' });
      return;
    }
    const [bRes, tRes, vRes, rRes] = await Promise.all([
      repo.getBudgetItems(eventId),
      repo.getTasks(eventId),
      repo.getVendors(eventId),
      repo.getRsvps(eventId),
    ]);

    set({
      currentEvent: eventRes.value,
      budgetItems: bRes.ok ? bRes.value : [],
      tasks: tRes.ok ? tRes.value : [],
      vendors: vRes.ok ? vRes.value : [],
      rsvps: rRes.ok ? rRes.value : [],
      isLoading: false,
      activeView: 'dashboard',
    });
  },

  loadDemoScenario: async () => {
    set({ isLoading: true, error: null });
    const repo = getEventRepository();

    const heroDate = '2026-11-20';
    const now = new Date('2026-08-20T00:00:00Z');

    const heroEvent: Event = {
      id: 'demo-pune-wedding-2026',
      members: { 'demo-user-pune-2026': 'owner' },
      title: PUNE_HERO_BLUEPRINT.title,
      eventType: 'wedding',
      date: heroDate,
      city: 'Pune',
      guestCount: 250,
      totalBudget: 1200000,
      tradition: 'Maharashtrian',
      vibe: 'Traditional Elegance',
      themes: PUNE_HERO_BLUEPRINT.themes,
      planB: PUNE_HERO_BLUEPRINT.planB,
      vendorChecklist: PUNE_HERO_BLUEPRINT.vendorChecklist,
    };

    const budgetItems: BudgetItem[] = PUNE_HERO_BLUEPRINT.budgetCategories.map((b, idx) => ({
      id: `b-${idx + 1}`,
      category: b.category,
      name: b.name,
      allocatedAmount: b.allocatedAmount,
      actualAmount: idx === 0 ? 350000 : idx === 1 ? 200000 : 0,
      paidAmount: idx === 0 ? 150000 : 0,
      status: (idx === 0 ? 'partial' : 'pending') as BudgetItem['status'],
      isLocked: false,
      rationale: b.rationale,
    }));

    const scheduledTasks: Task[] = reverseSchedule(
      heroDate,
      PUNE_HERO_BLUEPRINT.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        leadDays: t.leadDays,
        priority: t.priority,
      })),
      now
    );

    const vendors: Vendor[] = [
      {
        id: 'v-1',
        category: 'Venue',
        name: 'Grand Heritage Lawns & Banquets, Pune',
        contactName: 'Nilesh Patil',
        phone: '+91 98220 11223',
        email: 'events@grandheritagelawns.com',
        quotedAmount: 360000,
        status: 'booked',
        notes: 'Includes lawn, hall, and bridal suites',
      },
      {
        id: 'v-2',
        category: 'Catering',
        name: 'Shree Ganesh Traditional Caterers',
        contactName: 'Suresh Kulkarni',
        phone: '+91 98220 12345',
        email: 'ganeshcaterers@example.com',
        quotedAmount: 360000,
        status: 'shortlisted',
        notes: 'Includes live Ukdiche Modak counter and Jain setup',
      },
    ];

    await repo.createEventWithPlan(heroEvent, budgetItems, scheduledTasks, vendors);

    set({
      currentEvent: heroEvent,
      budgetItems,
      tasks: scheduledTasks,
      vendors,
      rsvps: [
        { id: 'r-1', guestName: 'Kulkarni Family', guestCount: 4, attendance: 'attending', dietaryPreference: 'veg' },
        { id: 'r-2', guestName: 'Deshpande Family', guestCount: 3, attendance: 'attending', dietaryPreference: 'jain_veg' },
      ],
      isLoading: false,
      activeView: 'dashboard',
    });
  },

  setEventData: ({ event, budgetItems, tasks, vendors }) => {
    set({
      currentEvent: event,
      budgetItems,
      tasks,
      vendors,
      activeView: 'dashboard',
    });
    // Seed the active repository so diff writes/reverts succeed
    void getEventRepository().createEventWithPlan(event, budgetItems, tasks, vendors);
  },

  updateBudgetItem: async (itemId: string, patch: Partial<BudgetItem>) => {
    const { currentEvent, budgetItems } = get();
    const next = budgetItems.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
    set({ budgetItems: next });
    if (currentEvent) {
      await getEventRepository().saveBudgetItems(currentEvent.id, next);
    }
  },

  updateBudgetItemsList: async (items: BudgetItem[]) => {
    const { currentEvent } = get();
    set({ budgetItems: items });
    if (currentEvent) {
      await getEventRepository().saveBudgetItems(currentEvent.id, items);
    }
  },

  updateTaskStatus: async (taskId: string, status: Task['status']) => {
    const { currentEvent, tasks } = get();
    const next = tasks.map((t) => (t.id === taskId ? { ...t, status } : t));
    set({ tasks: next });
    if (currentEvent) {
      const updated = next.find((t) => t.id === taskId);
      if (updated) {
        await getEventRepository().applyEntityDiff(currentEvent.id, {
          entity: 'task',
          op: 'update',
          id: taskId,
          after: updated,
          summary: `Updated task status to ${status}`,
        });
      }
    }
  },

  updateVendorStatus: async (vendorId: string, status: Vendor['status']) => {
    const { currentEvent, vendors } = get();
    const next = vendors.map((v) => (v.id === vendorId ? { ...v, status } : v));
    set({ vendors: next });
    if (currentEvent) {
      const updated = next.find((v) => v.id === vendorId);
      if (updated) {
        await getEventRepository().applyEntityDiff(currentEvent.id, {
          entity: 'vendor',
          op: 'update',
          id: vendorId,
          after: updated,
          summary: `Updated vendor status to ${status}`,
        });
      }
    }
  },

  addVendor: async (vendor: Vendor) => {
    const { currentEvent, vendors } = get();
    const next = [...vendors, vendor];
    set({ vendors: next });
    if (currentEvent) {
      await getEventRepository().applyEntityDiff(currentEvent.id, {
        entity: 'vendor',
        op: 'create',
        id: vendor.id,
        after: vendor,
        summary: `Added vendor ${vendor.name}`,
      });
    }
  },

  addRsvp: async (rsvpInput: Omit<Rsvp, 'id' | 'createdAt'>) => {
    const { currentEvent, rsvps } = get();
    if (!currentEvent) return;
    const res = await getEventRepository().createRsvp(currentEvent.id, rsvpInput);
    if (res.ok) {
      const newRsvp: Rsvp = {
        ...rsvpInput,
        id: res.value,
        createdAt: new Date().toISOString(),
      };
      set({ rsvps: [...rsvps, newRsvp] });
    }
  },

  toggleVendorChecklistItem: async (categoryIndex: number, itemIndex: number) => {
    const { currentEvent } = get();
    if (!currentEvent || !currentEvent.vendorChecklist) return;

    const nextChecklist = currentEvent.vendorChecklist.map((cat, cIdx) => {
      if (cIdx !== categoryIndex) return cat;
      return {
        ...cat,
        items: cat.items.map((item, iIdx) => {
          if (iIdx !== itemIndex) return item;
          return { ...item, done: !item.done };
        }),
      };
    });

    const updatedEvent: Event = { ...currentEvent, vendorChecklist: nextChecklist };
    set({ currentEvent: updatedEvent });
  },

  applyDiffToStore: async (diff: AnyEntityDiff): Promise<Result<void, AppError>> => {
    const { currentEvent, budgetItems, tasks, vendors } = get();
    if (!currentEvent) {
      return err({ code: 'event/not-loaded', message: 'No event currently loaded' });
    }

    if (diff.entity === 'budget') {
      const res = applyDiff<BudgetItem>(budgetItems, diff);
      if (!res.ok) return res;
      set({ budgetItems: res.value });
    } else if (diff.entity === 'task') {
      const res = applyDiff<Task>(tasks, diff);
      if (!res.ok) return res;
      set({ tasks: res.value });
    } else {
      const res = applyDiff<Vendor>(vendors, diff);
      if (!res.ok) return res;
      set({ vendors: res.value });
    }

    const repoResult = await getEventRepository().applyEntityDiff(currentEvent.id, diff);
    return repoResult.ok ? ok(undefined) : repoResult;
  },

  revertDiffInStore: async (diff: AnyEntityDiff): Promise<Result<void, AppError>> => {
    const { currentEvent, budgetItems, tasks, vendors } = get();
    if (!currentEvent) {
      return err({ code: 'event/not-loaded', message: 'No event currently loaded' });
    }

    if (diff.entity === 'budget') {
      const res = revertDiff<BudgetItem>(budgetItems, diff);
      if (!res.ok) return res;
      set({ budgetItems: res.value });
    } else if (diff.entity === 'task') {
      const res = revertDiff<Task>(tasks, diff);
      if (!res.ok) return res;
      set({ tasks: res.value });
    } else {
      const res = revertDiff<Vendor>(vendors, diff);
      if (!res.ok) return res;
      set({ vendors: res.value });
    }

    const repo = getEventRepository();
    if (diff.op === 'create') {
      const deleteResult = await repo.applyEntityDiff(currentEvent.id, {
        ...diff,
        op: 'delete',
        after: undefined,
      });
      return deleteResult.ok ? ok(undefined) : deleteResult;
    }

    const restoreDiff: AnyEntityDiff = { ...diff, op: 'update', after: diff.before } as AnyEntityDiff;
    const restoreResult = await repo.applyEntityDiff(currentEvent.id, restoreDiff);
    return restoreResult.ok ? ok(undefined) : restoreResult;
  },
}));
