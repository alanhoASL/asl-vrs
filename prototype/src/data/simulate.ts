import { DRINKS, OFFICE_HOURS, ROOMS } from './catalog';
import { purposeEnglishLabels } from './formCopy';
import { FLOORS, GUEST_COMPANIES, HOSTS, VENDOR_COMPANIES, VISITOR_NAMES } from './seed';
import { submitRegistration, submitTeaOrder } from './store';
import type { RegistrationType, TeaLine } from './types';
import { addDays, formatDateTime, isOfficeDay, minutesOfDay, startOfDay } from '../lib/date';

/** Prototype-only: creates the same records a visitor's phone would, for live demos. */

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const between = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

function hostPhone(): string {
  const first = Math.random() < 0.75 ? between(5, 9) : between(2, 3);
  const rest = String(between(0, 9999999)).padStart(7, '0');
  const digits = `${first}${rest}`;
  return `${digits.slice(0, 4)} ${digits.slice(4)}`;
}

function pickNames(count: number): string[] {
  const names = new Set<string>();
  while (names.size < count) names.add(pick(VISITOR_NAMES));
  return [...names];
}

function nextWeekday(day: Date): Date {
  let next = startOfDay(day);
  while (!isOfficeDay(next)) next = addDays(next, 1);
  return next;
}

/** Next half-hour slot at least an hour away, on a weekday inside office hours. */
function nextPlannedSlot(now: Date): Date {
  const earliest = minutesOfDay(now) + 60;
  const slot = Math.ceil(earliest / 30) * 30;
  const today = startOfDay(now);
  if (isOfficeDay(today) && slot >= OFFICE_HOURS.start && slot <= OFFICE_HOURS.end) {
    return new Date(today.getTime() + slot * 60000);
  }
  const day = nextWeekday(addDays(today, 1));
  return new Date(day.getTime() + (OFFICE_HOURS.start + between(1, 12) * 30) * 60000);
}

export function simulateRegistration(type: RegistrationType): string {
  const isVendor = type === 'vendor';
  const names = pickNames(Math.random() < 0.7 ? 1 : 2);
  const company = isVendor ? pick(VENDOR_COMPANIES) : pick(GUEST_COMPANIES);
  const plannedAt = type === 'guest-prereg' ? nextPlannedSlot(new Date()) : undefined;
  submitRegistration({
    type,
    company,
    hostStaff: pick(HOSTS),
    hostContact: type === 'guest-adhoc' ? '' : hostPhone(),
    plannedAt,
    purpose: isVendor ? pick(purposeEnglishLabels()) : undefined,
    floor: isVendor && Math.random() < 0.7 ? pick(FLOORS) : undefined,
    visitors: names.map((name) => ({
      name,
      idFirst4: isVendor ? `${String.fromCharCode(65 + between(0, 25))}${between(100, 999)}` : undefined,
    })),
  });
  return plannedAt
    ? `Pre-registration from ${company} for ${formatDateTime(plannedAt)}.`
    : `${isVendor ? 'Vendor' : 'On-site guest'} registration from ${company}.`;
}

export function simulateTeaOrder(): string {
  const room = pick(ROOMS);
  const lines: TeaLine[] = [];
  const used = new Set<string>();
  const lineCount = between(1, 3);
  while (lines.length < lineCount) {
    const drink = pick(DRINKS);
    if (used.has(drink.id)) continue;
    used.add(drink.id);
    lines.push({
      drinkId: drink.id,
      drinkName: drink.name,
      unit: drink.unit,
      menuNote: drink.note || undefined,
      quantity: between(1, 4),
    });
  }
  submitTeaOrder({
    roomId: room.id,
    roomName: room.name,
    lines,
    note: Math.random() < 0.3 ? 'Less sugar please' : undefined,
  });
  return `Tea order for ${room.name}.`;
}
