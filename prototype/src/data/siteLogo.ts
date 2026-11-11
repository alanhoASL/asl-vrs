import { useSyncExternalStore } from 'react';

const KEY = 'asl-vrs-site-logo';

/** Official ASL mark. Super admin can replace it; an empty store means this file. */
export const DEFAULT_LOGO_SRC = `${import.meta.env.BASE_URL}badge/asl-logo.png`;

function read(): string {
  try {
    const stored = localStorage.getItem(KEY) ?? '';
    return stored.startsWith('data:image/') ? stored : '';
  } catch {
    return '';
  }
}

let logo = read();
const listeners = new Set<() => void>();

function publish(next: string) {
  logo = next;
  if (next) localStorage.setItem(KEY, next);
  else localStorage.removeItem(KEY);
  listeners.forEach((listener) => listener());
}

window.addEventListener('storage', (event) => {
  if (event.key !== KEY) return;
  logo = read();
  listeners.forEach((listener) => listener());
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSiteLogo(): string {
  const custom = useSyncExternalStore(subscribe, () => logo);
  return custom || DEFAULT_LOGO_SRC;
}

export function siteLogoIsCustom(): boolean {
  return logo.length > 0;
}

export function saveSiteLogo(dataUrl: string): boolean {
  if (!dataUrl.startsWith('data:image/')) return false;
  publish(dataUrl);
  return true;
}

export function resetSiteLogo() {
  publish('');
}
