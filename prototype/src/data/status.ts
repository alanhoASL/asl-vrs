import { STATUS_LABELS, TYPE_LABELS } from './catalog';
import { visitorCountText } from './describe';
import type { Registration, VisitorStatus } from './types';
import { formatTime } from '../lib/date';

export type OverallState = 'pending' | 'done' | 'dismissed';

/** pending: someone still to be checked; done: everyone handled; dismissed: every row dismissed. */
export function overallState(r: Registration): OverallState {
  if (r.visitors.every((v) => v.status === 'dismissed')) return 'dismissed';
  if (r.visitors.some((v) => v.status === 'expected')) return 'pending';
  return 'done';
}

export function statusSummary(r: Registration): string {
  const order: VisitorStatus[] = ['expected', 'confirmed', 'printed', 'dismissed'];
  return order
    .map((s) => {
      const n = r.visitors.filter((v) => v.status === s).length;
      return n > 0 ? `${n} ${STATUS_LABELS[s].toLowerCase()}` : null;
    })
    .filter(Boolean)
    .join(', ');
}

export function registrationAccessibleName(r: Registration): string {
  return [
    formatTime(new Date(r.visitAt)),
    TYPE_LABELS[r.type].long,
    r.company,
    visitorCountText(r.visitors.length),
    statusSummary(r),
  ].join(', ');
}
