import type { Visitor } from './types';

/** Not dismissed and not confirmed. Printing a label does not count as confirmation. */
export function canConfirm(v: Visitor): boolean {
  return v.status !== 'dismissed' && !v.confirmedAt;
}

export function canDismiss(v: Visitor): boolean {
  return v.status !== 'dismissed' && !v.confirmedAt;
}

export function canPrint(v: Visitor): boolean {
  return v.status !== 'dismissed';
}
