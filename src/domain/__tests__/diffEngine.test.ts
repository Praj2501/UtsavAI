import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { applyDiff, revertDiff } from '../diffEngine';
import { BudgetDiff, TaskDiff, VendorDiff } from '../../types/diff.types';
import { BudgetItem, Task, Vendor } from '../../types/event.types';

describe('diffEngine (applyDiff & revertDiff)', () => {
  const initialItem: BudgetItem = {
    id: 'b-1',
    category: 'Decor',
    name: 'Mandap Flowers',
    allocatedAmount: 150000,
    actualAmount: 0,
    paidAmount: 0,
    status: 'pending',
    isLocked: false,
    rationale: 'Floral decorations',
  };

  it('applies and reverts create diff cleanly', () => {
    const state: BudgetItem[] = [];
    const diff: BudgetDiff = {
      entity: 'budget',
      op: 'create',
      id: 'b-1',
      after: initialItem,
      summary: 'Add mandap flowers',
    };

    const applied = applyDiff(state, diff);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.value).toEqual([initialItem]);

    const reverted = revertDiff(applied.value, diff);
    expect(reverted.ok).toBe(true);
    if (!reverted.ok) return;
    expect(reverted.value).toEqual([]);
  });

  it('applies and reverts update diff cleanly', () => {
    const state: BudgetItem[] = [initialItem];
    const updatedItem: BudgetItem = { ...initialItem, allocatedAmount: 180000 };
    const diff: BudgetDiff = {
      entity: 'budget',
      op: 'update',
      id: 'b-1',
      before: initialItem,
      after: updatedItem,
      summary: 'Increase mandap budget',
    };

    const applied = applyDiff(state, diff);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.value[0]?.allocatedAmount).toBe(180000);

    const reverted = revertDiff(applied.value, diff);
    expect(reverted.ok).toBe(true);
    if (!reverted.ok) return;
    expect(reverted.value[0]?.allocatedAmount).toBe(150000);
  });

  it('applies and reverts delete diff cleanly', () => {
    const state: BudgetItem[] = [initialItem];
    const diff: BudgetDiff = {
      entity: 'budget',
      op: 'delete',
      id: 'b-1',
      before: initialItem,
      summary: 'Remove item',
    };

    const applied = applyDiff(state, diff);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.value).toEqual([]);

    const reverted = revertDiff(applied.value, diff);
    expect(reverted.ok).toBe(true);
    if (!reverted.ok) return;
    expect(reverted.value).toEqual([initialItem]);
  });

  it('handles applyDiff error branches: conflict, not-found, missing payload', () => {
    // Conflict on create
    const conflictRes = applyDiff([initialItem], {
      entity: 'budget',
      op: 'create',
      id: 'b-1',
      after: initialItem,
      summary: '',
    });
    expect(conflictRes.ok).toBe(false);

    // Missing after payload on create
    const missingCreateRes = applyDiff([], {
      entity: 'budget',
      op: 'create',
      id: 'b-new',
      summary: '',
    });
    expect(missingCreateRes.ok).toBe(false);

    // Not found on update
    const notFoundUpdate = applyDiff([], {
      entity: 'budget',
      op: 'update',
      id: 'non-existent',
      after: initialItem,
      summary: '',
    });
    expect(notFoundUpdate.ok).toBe(false);

    // Missing after payload on update
    const missingUpdateRes = applyDiff([initialItem], {
      entity: 'budget',
      op: 'update',
      id: 'b-1',
      summary: '',
    });
    expect(missingUpdateRes.ok).toBe(false);

    // Not found on delete
    const notFoundDelete = applyDiff([], {
      entity: 'budget',
      op: 'delete',
      id: 'non-existent',
      summary: '',
    });
    expect(notFoundDelete.ok).toBe(false);
  });

  it('handles revertDiff error branches: not-found, missing before, conflict', () => {
    // Revert create on missing item
    const revertCreateNotFound = revertDiff([], {
      entity: 'budget',
      op: 'create',
      id: 'b-1',
      after: initialItem,
      summary: '',
    });
    expect(revertCreateNotFound.ok).toBe(false);

    // Revert update on missing item
    const revertUpdateNotFound = revertDiff([], {
      entity: 'budget',
      op: 'update',
      id: 'b-1',
      before: initialItem,
      after: initialItem,
      summary: '',
    });
    expect(revertUpdateNotFound.ok).toBe(false);

    // Revert update missing before payload
    const revertUpdateNoBefore = revertDiff([initialItem], {
      entity: 'budget',
      op: 'update',
      id: 'b-1',
      summary: '',
    });
    expect(revertUpdateNoBefore.ok).toBe(false);

    // Revert delete conflict (item exists)
    const revertDeleteConflict = revertDiff([initialItem], {
      entity: 'budget',
      op: 'delete',
      id: 'b-1',
      before: initialItem,
      summary: '',
    });
    expect(revertDeleteConflict.ok).toBe(false);

    // Revert delete missing before payload
    const revertDeleteNoBefore = revertDiff([], {
      entity: 'budget',
      op: 'delete',
      id: 'b-1',
      summary: '',
    });
    expect(revertDeleteNoBefore.ok).toBe(false);
  });

  it('applies task and vendor diffs cleanly', () => {
    const task: Task = {
      id: 't-1',
      title: 'Send Invites',
      category: 'Invites',
      targetDate: '2026-11-01',
      leadDays: 30,
      status: 'todo',
      priority: 'high',
      panicStatus: 'normal',
    };
    const taskDiff: TaskDiff = { entity: 'task', op: 'create', id: 't-1', after: task, summary: 'Add task' };
    const taskRes = applyDiff<Task>([], taskDiff);
    expect(taskRes.ok).toBe(true);

    const vendor: Vendor = {
      id: 'v-1',
      category: 'Catering',
      name: 'Peshwa Foods',
      contactName: 'Nitin',
      phone: '9822012345',
      email: 'nitin@test.com',
      quotedAmount: 200000,
      status: 'shortlisted',
      notes: '',
    };
    const vendorDiff: VendorDiff = { entity: 'vendor', op: 'create', id: 'v-1', after: vendor, summary: 'Add vendor' };
    const vendorRes = applyDiff<Vendor>([], vendorDiff);
    expect(vendorRes.ok).toBe(true);
  });

  // Fast-check property-based test: applyDiff -> revertDiff round trip identity
  it('property: revertDiff(applyDiff(state, diff)) === state across random entities', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          category: fc.string({ minLength: 1, maxLength: 10 }),
          name: fc.string({ minLength: 1, maxLength: 10 }),
          allocatedAmount: fc.integer({ min: 0, max: 100000 }),
          actualAmount: fc.constant(0),
          paidAmount: fc.constant(0),
          status: fc.constant('pending' as const),
          isLocked: fc.boolean(),
          rationale: fc.constant(''),
        }),
        item => {
          const state: BudgetItem[] = [];
          const diff: BudgetDiff = {
            entity: 'budget',
            op: 'create',
            id: item.id,
            after: item,
            summary: 'Created item',
          };

          const applied = applyDiff(state, diff);
          expect(applied.ok).toBe(true);
          if (applied.ok) {
            const reverted = revertDiff(applied.value, diff);
            expect(reverted.ok).toBe(true);
            if (reverted.ok) {
              expect(reverted.value).toEqual(state);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
