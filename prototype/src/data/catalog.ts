import type { Account, RegistrationType, VisitorStatus } from './types';
import { isOfficeDay, minutesToTime } from '../lib/date';

export const SITE_NAME = 'ASL';

/** Minutes from midnight. Office days are Monday to Friday. */
export const OFFICE_HOURS = { start: 9 * 60, end: 17 * 60 + 30 };
export const OFFICE_DAYS_EN = 'Mon – Fri';
export const OFFICE_DAYS_ZH = '星期一至五';

export interface ServiceWindow {
  /** Minutes from midnight, inclusive. */
  start: number;
  /** Minutes from midnight, exclusive. Service is closed at this minute. */
  end: number;
}

/** 09:00-12:00 and 14:00-16:45. Orders are accepted from each start until (not including) that end. */
export const TEA_SERVICE_HOURS: ServiceWindow[] = [
  { start: 9 * 60, end: 12 * 60 },
  { start: 14 * 60, end: 16 * 60 + 45 },
];

export const TEA_SERVICE_HOURS_EN = `${OFFICE_DAYS_EN}, ${TEA_SERVICE_HOURS
  .map((w) => `${minutesToTime(w.start)} - ${minutesToTime(w.end)}`)
  .join(', ')}`;

export const TEA_SERVICE_HOURS_ZH = `${OFFICE_DAYS_ZH} ${TEA_SERVICE_HOURS
  .map((w) => `${minutesToTime(w.start)} 至 ${minutesToTime(w.end)}`)
  .join('、')}`;

export function isTeaServiceOpen(minutes: number, day: Date = new Date()): boolean {
  if (!isOfficeDay(day)) return false;
  return TEA_SERVICE_HOURS.some((w) => minutes >= w.start && minutes < w.end);
}

/** 15-minute order slots inside the tea windows. The closing minute of each window is not included. */
export function teaServiceSlots(): number[] {
  const slots: number[] = [];
  for (const w of TEA_SERVICE_HOURS) {
    for (let m = w.start; m < w.end; m += 15) slots.push(m);
  }
  return slots;
}

/** Prototype only. Real accounts will come from the internal account store or SSO. */
export const ACCOUNTS: Account[] = [
  { id: 'acc-reception', username: 'reception', password: 'Reception@123', displayName: 'Reception', role: 'reception' },
  { id: 'acc-superadmin', username: 'superadmin', password: 'Admin@123', displayName: 'Super Admin', role: 'superadmin' },
];

export const TYPE_LABELS: Record<RegistrationType, { short: string; long: string; group: string }> = {
  'guest-prereg': { short: 'Pre-reg', long: 'Guest pre-registration', group: 'Guest' },
  'guest-adhoc': { short: 'On-site', long: 'Guest on-site', group: 'Guest' },
  vendor: { short: 'Vendor', long: 'Vendor / contractor', group: 'Vendor' },
};

export const STATUS_LABELS: Record<VisitorStatus, string> = {
  expected: 'Expected',
  confirmed: 'Confirmed',
  printed: 'Label printed',
  dismissed: 'Dismissed',
};

export interface Room {
  id: string;
  name: string;
  nameZh: string;
}

export const ROOMS: Room[] = [
  { id: 'acoe-15', name: 'ACoE (15/F)', nameZh: 'ACoE（15樓）' },
  { id: 'c1-15', name: 'C1 (15/F)', nameZh: 'C1（15樓）' },
  { id: 'c2-15', name: 'C2 (15/F)', nameZh: 'C2（15樓）' },
  { id: 'c3-16', name: 'C3 (16/F)', nameZh: 'C3（16樓）' },
  { id: 'c4-16', name: 'C4 (16/F)', nameZh: 'C4（16樓）' },
  { id: 'c5-10', name: 'C5 (10/F)', nameZh: 'C5（10樓）' },
  { id: 'm1-15', name: 'M1 (15/F)', nameZh: 'M1（15樓）' },
  { id: 'm2-15', name: 'M2 (15/F)', nameZh: 'M2（15樓）' },
  { id: 'm3-15', name: 'M3 (15/F)', nameZh: 'M3（15樓）' },
  { id: 'm4-15', name: 'M4 (15/F)', nameZh: 'M4（15樓）' },
  { id: 'm5-16', name: 'M5 (16/F)', nameZh: 'M5（16樓）' },
  { id: 'm6-16', name: 'M6 (16/F)', nameZh: 'M6（16樓）' },
];

export interface DrinkCategory {
  id: string;
  /** Letter on the drinks menu, e.g. "A". */
  code: string;
  name: string;
  nameZh: string;
}

export interface Drink {
  id: string;
  categoryId: string;
  name: string;
  nameZh: string;
  /** Standing menu note. Empty when the menu has none. */
  note: string;
  noteZh: string;
  /** English unit from the menu: glass or mug. */
  unit: string;
  unitZh: string;
  /** Prototype photos; the final menu photos are still to be supplied. */
  image: string;
}

const photo = (file: string) => `${import.meta.env.BASE_URL}drinks/${file}`;

/** Drinks menu, in menu order. Water is served by the glass; hot drinks by the mug. */
export const DRINK_CATEGORIES: DrinkCategory[] = [
  { id: 'water', code: 'A', name: 'Water', nameZh: '水' },
  { id: 'hot', code: 'B', name: 'Hot Drink', nameZh: '熱飲' },
];

export const DRINKS: Drink[] = [
  { id: 'warm-water', categoryId: 'water', name: 'Warm Water', nameZh: '暖水', note: '', noteZh: '', unit: 'glass', unitZh: '杯', image: photo('water-glass.jpg') },
  { id: 'ambient-water', categoryId: 'water', name: 'Ambient Water', nameZh: '常溫水', note: '', noteZh: '', unit: 'glass', unitZh: '杯', image: photo('water-glass.jpg') },
  { id: 'hot-chinese-tea', categoryId: 'hot', name: 'Hot Chinese Tea', nameZh: '熱中國茶', note: '', noteZh: '', unit: 'mug', unitZh: '杯', image: photo('chinese-tea.jpg') },
  { id: 'hot-coffee', categoryId: 'hot', name: 'Hot Coffee', nameZh: '熱咖啡', note: 'Sugar on the side', noteZh: '糖另上', unit: 'mug', unitZh: '杯', image: photo('coffee-light.jpg') },
  { id: 'hot-black-coffee', categoryId: 'hot', name: 'Hot Black Coffee', nameZh: '熱齋啡', note: '', noteZh: '', unit: 'mug', unitZh: '杯', image: photo('coffee.jpg') },
  { id: 'hot-tea-milk', categoryId: 'hot', name: 'Hot Tea with Milk', nameZh: '熱奶茶', note: 'Sugar on the side', noteZh: '糖另上', unit: 'mug', unitZh: '杯', image: photo('hk-milk-tea.jpg') },
  { id: 'hot-black-tea', categoryId: 'hot', name: 'Hot Black Tea', nameZh: '熱紅茶', note: '', noteZh: '', unit: 'mug', unitZh: '杯', image: photo('black-tea.jpg') },
];

export const MAX_VISITORS = 10;
