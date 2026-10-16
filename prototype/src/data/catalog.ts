import type { Account, RegistrationType, VisitorStatus } from './types';

export const SITE_NAME = 'ASL';

/** Minutes from midnight. */
export const OFFICE_HOURS = { start: 9 * 60, end: 17 * 60 + 30 };
/** Tea orders are accepted from start until (not including) end. */
export const TEA_SERVICE_HOURS = { start: 9 * 60, end: 16 * 60 + 45 };

/** Prototype only. Real accounts will come from the internal account store or SSO. */
export const ACCOUNTS: Account[] = [
  { id: 'acc-reception', username: 'reception', password: 'Reception@123', displayName: 'Reception', role: 'reception' },
  { id: 'acc-superadmin', username: 'superadmin', password: 'Admin@123', displayName: 'Super Admin', role: 'superadmin' },
];

export const TYPE_LABELS: Record<RegistrationType, { short: string; long: string; group: string }> = {
  'guest-prereg': { short: 'Pre-reg', long: 'Guest pre-registration', group: 'Guest' },
  'guest-adhoc': { short: 'Ad hoc', long: 'Guest ad hoc', group: 'Guest' },
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
  { id: 'board-room-a', name: 'Board Room A', nameZh: '董事會議室 A' },
  { id: 'conference-12a', name: 'Conference Room 12A', nameZh: '會議室 12A' },
  { id: 'conference-12b', name: 'Conference Room 12B', nameZh: '會議室 12B' },
  { id: 'meeting-15', name: 'Meeting Room 15/F', nameZh: '15樓會議室' },
];

export interface DrinkOption {
  id: string;
  name: string;
  nameZh: string;
}

export interface Drink {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  /** Prototype photos; the final menu photos are still to be supplied. */
  image: string;
  /** Each option is ordered with its own quantity so one order can mix them. */
  options?: DrinkOption[];
}

const MILK_OPTIONS: DrinkOption[] = [
  { id: 'black', name: 'Black', nameZh: '不加奶' },
  { id: 'milk', name: 'With milk', nameZh: '加奶' },
];

export const DRINKS: Drink[] = [
  { id: 'hk-milk-tea', name: 'Hong Kong milk tea', nameZh: '港式奶茶', description: 'Hot', descriptionZh: '熱', image: `${import.meta.env.BASE_URL}drinks/hk-milk-tea.jpg` },
  {
    id: 'lemon-tea', name: 'Lemon tea', nameZh: '檸檬茶', description: 'With fresh lemon', descriptionZh: '新鮮檸檬', image: `${import.meta.env.BASE_URL}drinks/lemon-tea.jpg`,
    options: [
      { id: 'hot', name: 'Hot', nameZh: '熱' },
      { id: 'iced', name: 'Iced', nameZh: '凍' },
    ],
  },
  { id: 'jasmine-tea', name: 'Jasmine tea', nameZh: '茉莉花茶', description: 'Hot, pot', descriptionZh: '熱，一壺', image: `${import.meta.env.BASE_URL}drinks/jasmine-tea.jpg` },
  {
    id: 'english-breakfast', name: 'English breakfast tea', nameZh: '英式早餐茶', description: 'Hot', descriptionZh: '熱', image: `${import.meta.env.BASE_URL}drinks/english-breakfast.jpg`,
    options: MILK_OPTIONS,
  },
  {
    id: 'coffee', name: 'Coffee', nameZh: '咖啡', description: 'Hot', descriptionZh: '熱', image: `${import.meta.env.BASE_URL}drinks/coffee.jpg`,
    options: MILK_OPTIONS,
  },
  { id: 'water', name: 'Bottled water', nameZh: '樽裝水', description: '', descriptionZh: '', image: `${import.meta.env.BASE_URL}drinks/water.jpg` },
];

export const MAX_VISITORS = 10;
