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
import { db } from '../services/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';

export class FirestoreEventRepository implements EventRepository {
  public async createEventWithPlan(
    event: Event,
    budgetItems: BudgetItem[],
    tasks: Task[],
    vendors: Vendor[]
  ): Promise<Result<void, AppError>> {
    try {
      const batch = writeBatch(db);

      // 1. Parent Event document
      const eventRef = doc(db, 'events', event.id);
      batch.set(eventRef, {
        id: event.id,
        members: event.members,
        title: event.title,
        eventType: event.eventType,
        date: event.date,
        city: event.city,
        guestCount: event.guestCount,
        totalBudget: event.totalBudget,
        tradition: event.tradition,
        vibe: event.vibe,
        themes: event.themes,
        planB: event.planB,
        vendorChecklist: event.vendorChecklist,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Public Event mirror document (public read, created in same batch via getAfter)
      const publicRef = doc(db, 'publicEvents', event.id);
      batch.set(publicRef, {
        title: event.title,
        date: event.date,
        city: event.city,
      });

      // 3. Subcollection: Budget items
      for (const item of budgetItems) {
        const itemRef = doc(db, 'events', event.id, 'budgetItems', item.id);
        batch.set(itemRef, {
          id: item.id,
          category: item.category,
          name: item.name,
          allocatedAmount: item.allocatedAmount,
          actualAmount: item.actualAmount,
          paidAmount: item.paidAmount,
          status: item.status,
          isLocked: item.isLocked,
          rationale: item.rationale,
          updatedAt: serverTimestamp(),
        });
      }

      // 4. Subcollection: Tasks
      for (const task of tasks) {
        const taskRef = doc(db, 'events', event.id, 'tasks', task.id);
        batch.set(taskRef, {
          id: task.id,
          title: task.title,
          category: task.category,
          targetDate: task.targetDate,
          leadDays: task.leadDays,
          status: task.status,
          priority: task.priority,
          panicStatus: task.panicStatus,
          isOverdueAtCreation: task.isOverdueAtCreation ?? false,
          updatedAt: serverTimestamp(),
        });
      }

      // 5. Subcollection: Vendors
      for (const vendor of vendors) {
        const vendorRef = doc(db, 'events', event.id, 'vendors', vendor.id);
        batch.set(vendorRef, {
          id: vendor.id,
          category: vendor.category,
          name: vendor.name,
          contactName: vendor.contactName,
          phone: vendor.phone,
          email: vendor.email,
          quotedAmount: vendor.quotedAmount,
          status: vendor.status,
          notes: vendor.notes,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      return ok(undefined);
    } catch (error: unknown) {
      const e = error as Error;
      return err({ code: 'firestore/batch-create-failed', message: e.message });
    }
  }

  public async getEvent(eventId: string): Promise<Result<Event | null, AppError>> {
    try {
      const snap = await getDoc(doc(db, 'events', eventId));
      if (!snap.exists()) return ok(null);
      return ok(snap.data() as Event);
    } catch (error: unknown) {
      const e = error as Error;
      return err({ code: 'firestore/read-failed', message: e.message });
    }
  }

  public async getPublicEvent(eventId: string): Promise<Result<PublicEvent | null, AppError>> {
    try {
      const snap = await getDoc(doc(db, 'publicEvents', eventId));
      if (!snap.exists()) return ok(null);
      return ok({ id: snap.id, ...snap.data() } as PublicEvent);
    } catch (error: unknown) {
      const e = error as Error;
      return err({ code: 'firestore/read-failed', message: e.message });
    }
  }

  public async getBudgetItems(eventId: string): Promise<Result<BudgetItem[], AppError>> {
    try {
      const snap = await getDocs(collection(db, 'events', eventId, 'budgetItems'));
      const items = snap.docs.map(d => d.data() as BudgetItem);
      return ok(items);
    } catch (error: unknown) {
      const e = error as Error;
      return err({ code: 'firestore/read-failed', message: e.message });
    }
  }

  public async getTasks(eventId: string): Promise<Result<Task[], AppError>> {
    try {
      const snap = await getDocs(collection(db, 'events', eventId, 'tasks'));
      const tasks = snap.docs.map(d => d.data() as Task);
      return ok(tasks);
    } catch (error: unknown) {
      const e = error as Error;
      return err({ code: 'firestore/read-failed', message: e.message });
    }
  }

  public async getVendors(eventId: string): Promise<Result<Vendor[], AppError>> {
    try {
      const snap = await getDocs(collection(db, 'events', eventId, 'vendors'));
      const vendors = snap.docs.map(d => d.data() as Vendor);
      return ok(vendors);
    } catch (error: unknown) {
      const e = error as Error;
      return err({ code: 'firestore/read-failed', message: e.message });
    }
  }

  public async getRsvps(eventId: string): Promise<Result<Rsvp[], AppError>> {
    try {
      const snap = await getDocs(collection(db, 'events', eventId, 'rsvps'));
      const rsvps = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Rsvp);
      return ok(rsvps);
    } catch (error: unknown) {
      const e = error as Error;
      return err({ code: 'firestore/read-failed', message: e.message });
    }
  }

  public async getRunSheetItems(eventId: string): Promise<Result<RunSheetItem[], AppError>> {
    try {
      const snap = await getDocs(collection(db, 'events', eventId, 'runSheetItems'));
      const items = snap.docs.map(d => d.data() as RunSheetItem);
      return ok(items);
    } catch (error: unknown) {
      const e = error as Error;
      return err({ code: 'firestore/read-failed', message: e.message });
    }
  }

  public async applyEntityDiff(eventId: string, diff: AnyEntityDiff): Promise<Result<void, AppError>> {
    try {
      const subcollection = diff.entity === 'budget' ? 'budgetItems' : diff.entity === 'task' ? 'tasks' : 'vendors';
      const ref = doc(db, 'events', eventId, subcollection, diff.id);

      if (diff.op === 'delete') {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, { ...diff.after, updatedAt: serverTimestamp() }, { merge: true });
      }
      return ok(undefined);
    } catch (error: unknown) {
      const e = error as Error;
      return err({ code: 'firestore/diff-write-failed', message: e.message });
    }
  }

  public async saveBudgetItems(eventId: string, items: BudgetItem[]): Promise<Result<void, AppError>> {
    try {
      const batch = writeBatch(db);
      for (const item of items) {
        const ref = doc(db, 'events', eventId, 'budgetItems', item.id);
        batch.set(ref, { ...item, updatedAt: serverTimestamp() }, { merge: true });
      }
      await batch.commit();
      return ok(undefined);
    } catch (error: unknown) {
      const e = error as Error;
      return err({ code: 'firestore/save-budget-failed', message: e.message });
    }
  }

  public async createRsvp(
    eventId: string,
    rsvpInput: Omit<Rsvp, 'id' | 'createdAt'>
  ): Promise<Result<string, AppError>> {
    try {
      const rsvpsRef = collection(db, 'events', eventId, 'rsvps');
      const newDocRef = doc(rsvpsRef);
      await setDoc(newDocRef, {
        id: newDocRef.id,
        guestName: rsvpInput.guestName,
        guestCount: rsvpInput.guestCount,
        attendance: rsvpInput.attendance,
        dietaryPreference: rsvpInput.dietaryPreference,
        note: rsvpInput.note ?? null,
        createdAt: serverTimestamp(),
      });
      return ok(newDocRef.id);
    } catch (error: unknown) {
      const e = error as Error;
      return err({ code: 'firestore/rsvp-create-failed', message: e.message });
    }
  }

  public subscribeToEvent(eventId: string, callback: (event: Event | null) => void): () => void {
    return onSnapshot(doc(db, 'events', eventId), snap => {
      callback(snap.exists() ? (snap.data() as Event) : null);
    });
  }

  public subscribeToBudget(eventId: string, callback: (items: BudgetItem[]) => void): () => void {
    return onSnapshot(collection(db, 'events', eventId, 'budgetItems'), snap => {
      callback(snap.docs.map(d => d.data() as BudgetItem));
    });
  }

  public subscribeToTasks(eventId: string, callback: (tasks: Task[]) => void): () => void {
    return onSnapshot(collection(db, 'events', eventId, 'tasks'), snap => {
      callback(snap.docs.map(d => d.data() as Task));
    });
  }

  public subscribeToVendors(eventId: string, callback: (vendors: Vendor[]) => void): () => void {
    return onSnapshot(collection(db, 'events', eventId, 'vendors'), snap => {
      callback(snap.docs.map(d => d.data() as Vendor));
    });
  }

  public subscribeToRsvps(eventId: string, callback: (rsvps: Rsvp[]) => void): () => void {
    return onSnapshot(collection(db, 'events', eventId, 'rsvps'), snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Rsvp));
    });
  }
}
