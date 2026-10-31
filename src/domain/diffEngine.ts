import { AnyEntityDiff } from '../types/diff.types';
import { AppError, Result, err, ok } from '../types/result.types';

export interface Identifiable {
  id: string;
}

/**
 * Applies a proposed AI diff to an in-memory entity collection immutably.
 *
 * @param items - Existing entities array.
 * @param diff - Discriminated union diff proposal.
 * @returns Result with modified array or AppError if preconditions fail.
 */
export function applyDiff<T extends Identifiable>(
  items: T[],
  diff: AnyEntityDiff
): Result<T[], AppError> {
  const existingIndex = items.findIndex(item => item.id === diff.id);

  switch (diff.op) {
    case 'create': {
      if (existingIndex !== -1) {
        return err({
          code: 'diff/conflict-id-exists',
          message: `Cannot create item with id "${diff.id}" because it already exists`,
        });
      }
      if (!diff.after) {
        return err({
          code: 'diff/missing-payload',
          message: `Create operation for "${diff.id}" missing 'after' entity payload`,
        });
      }
      return ok([...items, diff.after as unknown as T]);
    }

    case 'update': {
      if (existingIndex === -1) {
        return err({
          code: 'diff/not-found',
          message: `Cannot update item with id "${diff.id}" because it does not exist`,
        });
      }
      if (!diff.after) {
        return err({
          code: 'diff/missing-payload',
          message: `Update operation for "${diff.id}" missing 'after' entity payload`,
        });
      }
      const next = [...items];
      next[existingIndex] = diff.after as unknown as T;
      return ok(next);
    }

    case 'delete': {
      if (existingIndex === -1) {
        return err({
          code: 'diff/not-found',
          message: `Cannot delete item with id "${diff.id}" because it does not exist`,
        });
      }
      return ok(items.filter(item => item.id !== diff.id));
    }
  }
}

/**
 * Reverts an applied diff back to the prior state.
 * Exact mathematical inverse of applyDiff.
 *
 * @param items - Entities array after diff was applied.
 * @param diff - The diff that was previously applied.
 * @returns Result with restored array or AppError if preconditions fail.
 */
export function revertDiff<T extends Identifiable>(
  items: T[],
  diff: AnyEntityDiff
): Result<T[], AppError> {
  const existingIndex = items.findIndex(item => item.id === diff.id);

  switch (diff.op) {
    case 'create': {
      // Inverse of create is delete
      if (existingIndex === -1) {
        return err({
          code: 'diff/revert-not-found',
          message: `Cannot revert create: item "${diff.id}" not found`,
        });
      }
      return ok(items.filter(item => item.id !== diff.id));
    }

    case 'update': {
      // Inverse of update is restore 'before'
      if (existingIndex === -1) {
        return err({
          code: 'diff/revert-not-found',
          message: `Cannot revert update: item "${diff.id}" not found`,
        });
      }
      if (!diff.before) {
        return err({
          code: 'diff/missing-before-payload',
          message: `Cannot revert update: missing 'before' snapshot for "${diff.id}"`,
        });
      }
      const next = [...items];
      next[existingIndex] = diff.before as unknown as T;
      return ok(next);
    }

    case 'delete': {
      // Inverse of delete is re-insert 'before'
      if (existingIndex !== -1) {
        return err({
          code: 'diff/revert-conflict',
          message: `Cannot revert delete: item "${diff.id}" already exists`,
        });
      }
      if (!diff.before) {
        return err({
          code: 'diff/missing-before-payload',
          message: `Cannot revert delete: missing 'before' snapshot for "${diff.id}"`,
        });
      }
      return ok([...items, diff.before as unknown as T]);
    }
  }
}
