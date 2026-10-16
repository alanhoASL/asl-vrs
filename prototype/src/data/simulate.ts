import { DRINKS, OFFICE_HOURS, ROOMS } from './catalog';
import { FLOORS, GUEST_COMPANIES, HOSTS, VENDOR_COMPANIES, VENDOR_WORK, VISITOR_NAMES } from './seed';
import { submitRegistration, submitTeaOrder } from './store';
import type { RegistrationType, TeaLine } from './types';
import { addDays, formatDateTime, minutesOfDay, startOfDay } from '../lib/date';

/** Prototype-only: creates the same records a visitor's phone would, for live demos. */

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const between = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

function pickNames(count: number): string[] {
  const names = new Set<string>();
  while (names.size < count) names.add(pick(VISITOR_NAMES));
  return [...names];
}

/** Next half-hour slot at least an hour away and inside office hours, rolling over to tomorrow. */
function nextPlannedSlot(now: Date): Date {
  const earliest = minutesOfDay(now) + 60;
  const slot = Math.ceil(earliest / 30) * 30;
  if (slot >= OFFICE_HOURS.start && slot <= OFFICE_HOURS.end) {
    return new Date(startOfDay(now).getTime() + slot * 60000);
  }
  const tomorrow = addDays(startOfDay(now), 1);
  return new Date(tomorrow.getTime() + (OFFICE_HOURS.start + between(1, 12) * 30) * 60000);
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
    plannedAt,
    purpose: isVendor ? pick(VENDOR_WORK) : undefined,
    floor: isVendor && Math.random() < 0.7 ? pick(FLOORS) : undefined,
    visitors: names.map((name) => ({
      name,
      idFirst4: isVendor ? `${String.fromCharCode(65 + between(0, 25))}${between(100, 999)}` : undefined,
    })),
  });
  return plannedAt
    ? `Pre-registration from ${company} for ${formatDateTime(plannedAt)}.`
    : `${isVendor ? 'Vendor' : 'Ad hoc guest'} registration from ${company}.`;
}

export function simulateTeaOrder(): string {
  const room = pick(ROOMS);
  const lines: TeaLine[] = [];
  const used = new Set<string>();
  const lineCount = between(1, 3);
  while (lines.length < lineCount) {
    const drink = pick(DRINKS);
    const option = drink.options ? pick(drink.options) : undefined;
    const key = `${drink.id}:${option?.id ?? ''}`;
    if (used.has(key)) continue;
    used.add(key);
    lines.push({ drinkId: drink.id, drinkName: drink.name, optionId: option?.id, optionName: option?.name, quantity: between(1, 4) });
  }
  submitTeaOrder({
    roomId: room.id,
    roomName: room.name,
    lines,
    note: Math.random() < 0.3 ? 'Less sugar please' : undefined,
  });
  return `Tea order for ${room.name}.`;
}
