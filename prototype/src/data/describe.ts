import { formatDateTime } from '../lib/date';
import type { Registration, RegistrationType, TeaLine, TeaOrder } from './types';

export function registrationTitle(type: RegistrationType): string {
  switch (type) {
    case 'guest-prereg':
      return 'New guest pre-registration';
    case 'guest-adhoc':
      return 'New ad hoc guest at reception';
    case 'vendor':
      return 'New vendor / contractor at reception';
  }
}

export function visitorCountText(count: number): string {
  return count === 1 ? '1 visitor' : `${count} visitors`;
}

export function describeRegistration(r: Registration): string {
  const parts = [r.company, visitorCountText(r.visitors.length)];
  if (r.type === 'vendor' && r.purpose) parts.push(r.purpose);
  if (r.type === 'guest-prereg') parts.push(`visit ${formatDateTime(new Date(r.visitAt))}`);
  parts.push(`host ${r.hostStaff}`);
  return parts.join(' · ');
}

/** "Coffee (With milk)" */
export function teaLineName(l: TeaLine): string {
  return l.optionName ? `${l.drinkName} (${l.optionName})` : l.drinkName;
}

export function describeTeaOrder(o: TeaOrder): string {
  return o.lines.map((l) => `${l.quantity} x ${teaLineName(l)}`).join(', ');
}
