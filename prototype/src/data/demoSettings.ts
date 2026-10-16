import { useSyncExternalStore } from 'react';

/** Prototype-only switches, shared across tabs so the tea page follows the portal's demo menu. */
export interface DemoSettings {
  /** When off, the tea page accepts orders at any time of day. */
  enforceTeaHours: boolean;
}

const KEY = 'asl-vrs-prototype-demo';
const DEFAULTS: DemoSettings = { enforceTeaHours: false };
const listeners = new Set<() => void>();

function read(): DemoSettings {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<DemoSettings>) };
  } catch {
    return DEFAULTS;
  }
}

let settings = read();

window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  settings = read();
  listeners.forEach((l) => l());
});

export function setDemoSettings(patch: Partial<DemoSettings>) {
  settings = { ...settings, ...patch };
  localStorage.setItem(KEY, JSON.stringify(settings));
  listeners.forEach((l) => l());
}

export function useDemoSettings(): DemoSettings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => settings,
  );
}
