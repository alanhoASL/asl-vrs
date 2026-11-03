import { useSyncExternalStore } from 'react';
import type { RegistrationType } from './types';

export interface BilingualText {
  en: string;
  zh: string;
}

export interface PurposeOption {
  id: string;
  en: string;
  zh: string;
}

/** The sentence under each form title. English and Chinese are both required. */
export const DEFAULT_FORM_SUBTITLES: Record<RegistrationType, BilingualText> = {
  'guest-prereg': {
    en: 'Plan your visit before arriving.',
    zh: '請於到訪前預先登記。',
  },
  'guest-adhoc': {
    en: 'Register when you arrive at reception.',
    zh: '抵達接待處時登記。',
  },
  vendor: {
    en: 'Reception will complete the visit details.',
    zh: '接待處職員將補充到訪資料。',
  },
};

/** Work types on the vendor form. English is what reception sees after submit. */
export const DEFAULT_PURPOSES: PurposeOption[] = [
  { id: 'aircon', en: 'Air-conditioning maintenance', zh: '空調保養' },
  { id: 'lift', en: 'Lift inspection', zh: '升降機檢查' },
  { id: 'cabling', en: 'Network cabling', zh: '網絡布線' },
  { id: 'fire', en: 'Fire safety check', zh: '消防安全檢查' },
  { id: 'pest', en: 'Pest control', zh: '滅蟲' },
  { id: 'plumbing', en: 'Plumbing repair', zh: '水喉維修' },
  { id: 'windows', en: 'Window cleaning', zh: '玻璃清潔' },
  { id: 'printer', en: 'Printer servicing', zh: '打印機維修' },
  { id: 'electrical', en: 'Electrical inspection', zh: '電力檢查' },
];

interface FormCopy {
  subtitles: Record<RegistrationType, BilingualText>;
  purposes: PurposeOption[];
}

const KEY = 'asl-vrs-form-copy';
const FORM_TYPES = Object.keys(DEFAULT_FORM_SUBTITLES) as RegistrationType[];

function textOf(value: unknown): BilingualText | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<BilingualText>;
  const en = typeof item.en === 'string' ? item.en.trim() : '';
  const zh = typeof item.zh === 'string' ? item.zh.trim() : '';
  return en && zh ? { en, zh } : null;
}

function sanitizeSubtitles(value: unknown): Record<RegistrationType, BilingualText> {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<Record<RegistrationType, unknown>>;
  const next = { ...DEFAULT_FORM_SUBTITLES };
  FORM_TYPES.forEach((type) => {
    const item = textOf(raw[type]);
    if (item) next[type] = item;
  });
  return next;
}

function sanitizePurposes(value: unknown): PurposeOption[] {
  if (!Array.isArray(value)) return DEFAULT_PURPOSES.map((item) => ({ ...item }));
  const next: PurposeOption[] = [];
  const seen = new Set<string>();
  value.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const item = entry as Partial<PurposeOption>;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const en = typeof item.en === 'string' ? item.en.trim() : '';
    const zh = typeof item.zh === 'string' ? item.zh.trim() : '';
    if (!id || !en || !zh || seen.has(id)) return;
    seen.add(id);
    next.push({ id, en, zh });
  });
  return next.length > 0 ? next : DEFAULT_PURPOSES.map((item) => ({ ...item }));
}

function defaults(): FormCopy {
  return {
    subtitles: { ...DEFAULT_FORM_SUBTITLES },
    purposes: DEFAULT_PURPOSES.map((item) => ({ ...item })),
  };
}

function sanitize(value: unknown): FormCopy {
  const next = defaults();
  if (!value || typeof value !== 'object') return next;
  const raw = value as Record<string, unknown>;
  if ('subtitles' in raw || 'purposes' in raw) {
    next.subtitles = sanitizeSubtitles(raw.subtitles);
    next.purposes = sanitizePurposes(raw.purposes);
    return next;
  }
  next.subtitles = sanitizeSubtitles(raw);
  return next;
}

function read(): FormCopy {
  try {
    return sanitize(JSON.parse(localStorage.getItem(KEY) ?? '{}'));
  } catch {
    return defaults();
  }
}

let copy = read();
const listeners = new Set<() => void>();

function publish(next: FormCopy) {
  copy = next;
  localStorage.setItem(KEY, JSON.stringify(copy));
  listeners.forEach((listener) => listener());
}

window.addEventListener('storage', (event) => {
  if (event.key !== KEY) return;
  copy = read();
  listeners.forEach((listener) => listener());
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFormSubtitles(): Record<RegistrationType, BilingualText> {
  return useSyncExternalStore(subscribe, () => copy.subtitles);
}

export function usePurposeOptions(): PurposeOption[] {
  return useSyncExternalStore(subscribe, () => copy.purposes);
}

export function purposeEnglishLabels(): string[] {
  return copy.purposes.map((item) => item.en);
}

export function saveFormSubtitle(type: RegistrationType, text: BilingualText): boolean {
  const en = text.en.trim();
  const zh = text.zh.trim();
  if (!en || !zh) return false;
  publish({ ...copy, subtitles: { ...copy.subtitles, [type]: { en, zh } } });
  return true;
}

export function resetFormSubtitle(type: RegistrationType) {
  publish({
    ...copy,
    subtitles: { ...copy.subtitles, [type]: { ...DEFAULT_FORM_SUBTITLES[type] } },
  });
}

export function savePurposeOptions(options: PurposeOption[]): boolean {
  const cleaned = sanitizePurposes(options);
  if (cleaned.length !== options.length) return false;
  publish({ ...copy, purposes: cleaned });
  return true;
}

export function resetPurposeOptions() {
  publish({ ...copy, purposes: DEFAULT_PURPOSES.map((item) => ({ ...item })) });
}
