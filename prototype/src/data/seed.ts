import { ACCOUNTS, DRINKS, OFFICE_HOURS, ROOMS, TEA_SERVICE_HOURS } from './catalog';
import { addDays, startOfDay } from '../lib/date';
import type {
  AppNotification, AppState, AuditEntry, Registration, RegistrationType, TeaLine, TeaOrder, Visitor, VisitorStatus,
} from './types';
import { describeRegistration, describeTeaOrder, registrationTitle } from './describe';

export const STATE_VERSION = 1;

export const VISITOR_NAMES = [
  'Alex Lee', 'Karen Lau', 'Michael Cheung', 'Ivy Ho', 'Kelvin Ng', 'Grace Tse', 'Raymond Yip', 'Cindy Leung',
  'Patrick Kwok', 'Winnie Tang', 'Jason Fung', 'Emily Chow', 'Tony Siu', 'Mandy Lo', 'Eric Poon', 'Joyce Wan',
  'Ben Tsang', 'Sharon Kong', 'Vincent Hui', 'Natalie Chu', 'Gary Mok', 'Phoebe Lai', 'Simon Au', 'Rachel Yuen',
  'David Smith', 'Priya Sharma', 'Tom Baker', 'Hannah Kim', 'Leo Martin', 'Sophie Turner',
];

export const GUEST_COMPANIES = [
  'Sample Company Ltd', 'Pacific Legal LLP', 'Lion Rock Consulting', 'Victoria IT Solutions', 'Harbour Capital Partners',
  'Kowloon Bay Insurance', 'Star Ferry Media', 'Tsim Sha Tsui Trading Co.', 'Island East Architects', 'Peak Audit & Tax',
];

export const VENDOR_COMPANIES = [
  'Sample Services Ltd.', 'Kowloon Air-Con Services', 'Peak Lift Maintenance', 'Bauhinia Cleaning Co.',
  'Harbour Engineering Ltd', 'Dragon Fire Safety', 'Metro Network Cabling', 'Green Pest Control',
];

export const VENDOR_WORK = [
  'Air-conditioning maintenance', 'Lift inspection', 'Network cabling', 'Fire safety check', 'Pest control',
  'Plumbing repair', 'Window cleaning', 'Printer servicing', 'Electrical inspection',
];

export const HOSTS = ['Jamie Chan', 'Daniel Lam', 'Fiona Yeung', 'Henry Choi', 'Queenie Mak', 'Oscar Wong', 'Stella Ip'];
export const FLOORS = ['12/F', '15/F', '8/F', 'G/F', '20/F', '3/F'];

/** Today's walk-ins, placed this many minutes before "now" so the desk always has recent arrivals. */
const TODAY_WALK_INS: { type: RegistrationType; minutesAgo: number }[] = [
  { type: 'vendor', minutesAgo: 6 },
  { type: 'guest-adhoc', minutesAgo: 14 },
  { type: 'vendor', minutesAgo: 48 },
  { type: 'guest-adhoc', minutesAgo: 95 },
  { type: 'vendor', minutesAgo: 160 },
];

/** Deterministic PRNG so the dummy data looks the same on every reset. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeedState(now: Date = new Date()): AppState {
  const rand = mulberry32(20261016);
  const pick = <T,>(list: T[]): T => list[Math.floor(rand() * list.length)];
  const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const notAfterNow = (d: Date) => new Date(Math.min(d.getTime(), now.getTime()));

  const reception = ACCOUNTS[0];
  const superadmin = ACCOUNTS[1];
  const today = startOfDay(now);

  const registrations: Registration[] = [];
  const audit: AuditEntry[] = [];
  let regCounter = 0;
  let visitorCounter = 0;
  let auditCounter = 0;

  const addAudit = (entry: Omit<AuditEntry, 'id'>) => {
    auditCounter += 1;
    audit.push({ id: `audit-seed-${auditCounter}`, ...entry });
  };

  const addRegistration = (type: RegistrationType, visitAt: Date) => {
    const submittedAt = type === 'guest-prereg'
      ? new Date(Math.min(visitAt.getTime() - between(1, 7) * 86400000 - between(0, 600) * 60000, now.getTime() - between(30, 2000) * 60000))
      : visitAt;

    const sizeRoll = rand();
    const size = sizeRoll < 0.6 ? 1 : sizeRoll < 0.85 ? 2 : sizeRoll < 0.95 ? 3 : 4;

    regCounter += 1;
    const regId = `reg-${String(regCounter).padStart(4, '0')}`;
    const visitors: Visitor[] = [];
    const usedNames = new Set<string>();

    for (let v = 0; v < size; v += 1) {
      let name = pick(VISITOR_NAMES);
      while (usedNames.has(name)) name = pick(VISITOR_NAMES);
      usedNames.add(name);
      visitorCounter += 1;

      const visitor: Visitor = {
        id: `vis-${String(visitorCounter).padStart(5, '0')}`,
        name,
        status: 'expected',
        printCount: 0,
      };
      if (type === 'vendor') {
        visitor.idFirst4 = `${String.fromCharCode(65 + between(0, 25))}${between(100, 999)}`;
      }

      const arrivedWindowPassed = visitAt.getTime() < now.getTime() - 20 * 60000;
      let status: VisitorStatus = 'expected';
      if (arrivedWindowPassed) {
        const s = rand();
        if (type === 'guest-prereg') {
          status = s < 0.62 ? 'printed' : s < 0.78 ? 'confirmed' : s < 0.86 ? 'dismissed' : 'expected';
        } else {
          status = s < 0.8 ? 'printed' : s < 0.92 ? 'confirmed' : 'dismissed';
        }
      }

      const staff = rand() < 0.85 ? reception : superadmin;
      if (status === 'confirmed' || status === 'printed') {
        const confirmedAt = notAfterNow(new Date(visitAt.getTime() + between(2, 12) * 60000));
        visitor.status = status;
        visitor.confirmedBy = staff.displayName;
        visitor.confirmedAt = confirmedAt.toISOString();
        addAudit({
          at: visitor.confirmedAt, accountId: staff.id, accountName: staff.displayName,
          action: 'Confirm', registrationId: regId, visitorId: visitor.id, detail: name,
        });
        if (status === 'printed') {
          const printedAt = notAfterNow(new Date(confirmedAt.getTime() + between(1, 3) * 60000));
          visitor.printCount = 1;
          visitor.lastPrintedAt = printedAt.toISOString();
          addAudit({
            at: visitor.lastPrintedAt, accountId: staff.id, accountName: staff.displayName,
            action: 'Print label', registrationId: regId, visitorId: visitor.id, detail: name,
          });
        }
      } else if (status === 'dismissed') {
        visitor.status = 'dismissed';
        addAudit({
          at: notAfterNow(new Date(visitAt.getTime() + between(5, 40) * 60000)).toISOString(),
          accountId: staff.id, accountName: staff.displayName,
          action: 'Dismiss', registrationId: regId, visitorId: visitor.id, detail: `${name} (duplicate)`,
        });
      }
      visitors.push(visitor);
    }

    const registration: Registration = {
      id: regId,
      type,
      company: type === 'vendor' ? pick(VENDOR_COMPANIES) : pick(GUEST_COMPANIES),
      hostStaff: pick(HOSTS),
      visitAt: visitAt.toISOString(),
      submittedAt: submittedAt.toISOString(),
      visitors,
    };
    if (type === 'vendor') {
      registration.purpose = pick(VENDOR_WORK);
      if (rand() < 0.7) registration.floor = pick(FLOORS);
    }
    registrations.push(registration);
  };

  for (let offset = -21; offset <= 28; offset += 1) {
    const day = addDays(today, offset);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const count = offset === 0 ? between(5, 6) : weekend ? between(0, 1) : between(2, 5);

    for (let i = 0; i < count; i += 1) {
      const roll = rand();
      // Walk-ins only exist once the person has arrived, so today and later are pre-registrations here.
      const type: RegistrationType = offset >= 0 || roll < 0.5 ? 'guest-prereg' : roll < 0.72 ? 'guest-adhoc' : 'vendor';
      const officeMinutes = OFFICE_HOURS.end - OFFICE_HOURS.start;
      const minutesIn = type === 'guest-prereg' ? between(0, officeMinutes / 30) * 30 : between(0, officeMinutes / 15) * 15;
      addRegistration(type, new Date(day.getTime() + (OFFICE_HOURS.start + minutesIn) * 60000));
    }
  }

  const officeStart = today.getTime() + OFFICE_HOURS.start * 60000;
  const officeEnd = today.getTime() + OFFICE_HOURS.end * 60000;
  for (const w of TODAY_WALK_INS) {
    const visitAt = new Date(now.getTime() - w.minutesAgo * 60000);
    if (visitAt.getTime() >= officeStart && visitAt.getTime() <= officeEnd) addRegistration(w.type, visitAt);
  }

  // Sign-in rows so the audit log is not only visit actions.
  for (let offset = -14; offset <= 0; offset += 1) {
    const day = addDays(today, offset);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    addAudit({
      at: notAfterNow(new Date(day.getTime() + (8 * 60 + between(40, 58)) * 60000)).toISOString(),
      accountId: reception.id, accountName: reception.displayName, action: 'Sign in',
    });
    if (offset < 0) {
      addAudit({
        at: new Date(day.getTime() + (18 * 60 + between(0, 30)) * 60000).toISOString(),
        accountId: reception.id, accountName: reception.displayName, action: 'Sign out',
      });
    }
  }

  const teaOrders: TeaOrder[] = [];
  let teaCounter = 0;
  for (let offset = -14; offset <= 0; offset += 1) {
    const day = addDays(today, offset);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const count = between(0, 4);
    for (let i = 0; i < count; i += 1) {
      const latestSlot = (TEA_SERVICE_HOURS.end - TEA_SERVICE_HOURS.start) / 15 - 1;
      const createdAt = new Date(day.getTime() + (TEA_SERVICE_HOURS.start + between(0, latestSlot) * 15) * 60000);
      if (createdAt > now) continue;
      const room = pick(ROOMS);
      const lineCount = between(1, 3);
      const chosen = new Set<string>();
      const lines: TeaLine[] = [];
      for (let l = 0; l < lineCount; l += 1) {
        const drink = pick(DRINKS);
        const option = drink.options ? pick(drink.options) : undefined;
        const key = `${drink.id}:${option?.id ?? ''}`;
        if (chosen.has(key)) continue;
        chosen.add(key);
        lines.push({
          drinkId: drink.id, drinkName: drink.name, optionId: option?.id, optionName: option?.name, quantity: between(1, 6),
        });
      }
      teaCounter += 1;
      teaOrders.push({
        id: `tea-${String(teaCounter).padStart(4, '0')}`,
        roomId: room.id,
        roomName: room.name,
        lines,
        note: rand() < 0.25 ? 'Less sugar please' : undefined,
        createdAt: createdAt.toISOString(),
      });
    }
  }

  const allIds = ACCOUNTS.map((a) => a.id);
  const notifications: AppNotification[] = [];
  const recentCutoff = now.getTime() - 3 * 86400000;
  const unreadCutoff = now.getTime() - 6 * 3600000;

  for (const r of registrations) {
    const t = new Date(r.submittedAt).getTime();
    if (t < recentCutoff || t > now.getTime()) continue;
    notifications.push({
      id: `ntf-${r.id}`,
      kind: 'registration',
      title: registrationTitle(r.type),
      body: describeRegistration(r),
      createdAt: r.submittedAt,
      registrationId: r.id,
      readBy: t < unreadCutoff ? allIds : [],
      popupClosedBy: allIds,
    });
  }
  for (const o of teaOrders) {
    const t = new Date(o.createdAt).getTime();
    if (t < recentCutoff) continue;
    notifications.push({
      id: `ntf-${o.id}`,
      kind: 'tea',
      title: `Tea order for ${o.roomName}`,
      body: describeTeaOrder(o),
      createdAt: o.createdAt,
      teaOrderId: o.id,
      readBy: t < unreadCutoff ? allIds : [],
      popupClosedBy: allIds,
    });
  }

  notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  audit.sort((a, b) => b.at.localeCompare(a.at));

  return { version: STATE_VERSION, registrations, teaOrders, notifications, audit };
}
