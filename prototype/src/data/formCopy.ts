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
  /** When selected, the form asks for a written description. */
  specify?: boolean;
}

/** The sentence under each form title. English and Chinese are both required. */
export const DEFAULT_FORM_SUBTITLES: Record<RegistrationType, BilingualText> = {
  'guest-prereg': {
    en: 'Please register before arrival.',
    zh: '請於到訪前登記。',
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

/** Work types on the vendor form, in the agreed order. English is what reception sees after submit. */
export const DEFAULT_PURPOSES: PurposeOption[] = [
  { id: 'access', en: 'Access Control System Maintenance', zh: '門禁系統維修' },
  { id: 'aircon', en: 'Air Conditioning Maintenance', zh: '冷氣維修' },
  { id: 'alarm', en: 'Alarm System Maintenance', zh: '警鐘系統維修' },
  { id: 'cleaning', en: 'Cleaning Services', zh: '清潔服務' },
  { id: 'fire', en: 'Fire Safety Equipment Maintenance', zh: '消防維修' },
  { id: 'fitout', en: 'Fit-out Works', zh: '裝修工程' },
  { id: 'it', en: 'IT Equipment Maintenance', zh: 'IT設備維修' },
  { id: 'printer', en: 'Printer Equipment Maintenance', zh: '打印機維修' },
  { id: 'telephone', en: 'Telephone System Maintenance', zh: '電話系統維修' },
  { id: 'others', en: 'Others, please specify:', zh: '其他，請註明:', specify: true },
];

/** Sentence under the room name on a tea order page. */
export const DEFAULT_TEA_PROMPT: BilingualText = {
  en: 'Please choose your drinks from below menu.',
  zh: '請選擇飲品。',
};

const PREVIOUS_PREREG: BilingualText = {
  en: 'Plan your visit before arriving.',
  zh: '請於到訪前預先登記。',
};

const PREVIOUS_PURPOSES: PurposeOption[] = [
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
  teaPrompt: BilingualText;
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
    next.push({ id, en, zh, ...(item.specify === true ? { specify: true } : {}) });
  });
  return next.length > 0 ? next : DEFAULT_PURPOSES.map((item) => ({ ...item }));
}

function defaults(): FormCopy {
  return {
    subtitles: { ...DEFAULT_FORM_SUBTITLES },
    purposes: DEFAULT_PURPOSES.map((item) => ({ ...item })),
    teaPrompt: { ...DEFAULT_TEA_PROMPT },
  };
}

function samePurposeList(a: PurposeOption[], b: PurposeOption[]): boolean {
  return a.length === b.length && a.every((item, index) => (
    item.id === b[index].id && item.en === b[index].en && item.zh === b[index].zh && !!item.specify === !!b[index].specify
  ));
}

/** Saved copies of the previous defaults pick up the reviewed wording. Edited text is left as saved. */
function migrate(next: FormCopy): FormCopy {
  const prereg = next.subtitles['guest-prereg'];
  if (prereg.en === PREVIOUS_PREREG.en && prereg.zh === PREVIOUS_PREREG.zh) {
    next.subtitles = { ...next.subtitles, 'guest-prereg': { ...DEFAULT_FORM_SUBTITLES['guest-prereg'] } };
  }
  if (samePurposeList(next.purposes, PREVIOUS_PURPOSES)) {
    next.purposes = DEFAULT_PURPOSES.map((item) => ({ ...item }));
  }
  return next;
}

function sanitize(value: unknown): FormCopy {
  const next = defaults();
  if (!value || typeof value !== 'object') return next;
  const raw = value as Record<string, unknown>;
  if ('subtitles' in raw || 'purposes' in raw || 'teaPrompt' in raw) {
    next.subtitles = sanitizeSubtitles(raw.subtitles);
    next.purposes = sanitizePurposes(raw.purposes);
    const tea = textOf(raw.teaPrompt);
    if (tea) next.teaPrompt = tea;
    return migrate(next);
  }
  next.subtitles = sanitizeSubtitles(raw);
  return migrate(next);
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

export function useTeaPrompt(): BilingualText {
  return useSyncExternalStore(subscribe, () => copy.teaPrompt);
}

/** Work types that can be stored as a finished purpose, without the "please specify" row. */
export function purposeEnglishLabels(): string[] {
  const named = copy.purposes.filter((item) => !item.specify).map((item) => item.en);
  return named.length > 0 ? named : copy.purposes.map((item) => item.en);
}

export function joinPurpose(option: PurposeOption, detail: string): string {
  if (!option.specify) return option.en;
  const text = detail.trim();
  return text ? `${option.en} ${text}` : option.en;
}

export function splitPurpose(stored: string | undefined, options: PurposeOption[]): { id: string; detail: string } {
  if (!stored) return { id: '', detail: '' };
  const exact = options.find((item) => !item.specify && item.en === stored);
  if (exact) return { id: exact.id, detail: '' };
  const custom = [...options].reverse().find((item) => item.specify && (stored === item.en || stored.startsWith(item.en)));
  if (!custom) return { id: '', detail: '' };
  const detail = stored.startsWith(custom.en) ? stored.slice(custom.en.length).replace(/^[:\s]+/, '') : '';
  return { id: custom.id, detail };
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

export function saveTeaPrompt(text: BilingualText): boolean {
  const en = text.en.trim();
  const zh = text.zh.trim();
  if (!en || !zh) return false;
  publish({ ...copy, teaPrompt: { en, zh } });
  return true;
}

export function resetTeaPrompt() {
  publish({ ...copy, teaPrompt: { ...DEFAULT_TEA_PROMPT } });
}
