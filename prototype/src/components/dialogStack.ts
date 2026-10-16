import { useSyncExternalStore } from 'react';

/**
 * Open modal dialogs make everything outside them inert, so alerts that must stay usable
 * (tea popups) are rendered into the host element of the top-most open dialog.
 */
const hosts: HTMLElement[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function pushDialogHost(host: HTMLElement) {
  if (!hosts.includes(host)) {
    hosts.push(host);
    emit();
  }
}

export function removeDialogHost(host: HTMLElement) {
  const i = hosts.indexOf(host);
  if (i >= 0) {
    hosts.splice(i, 1);
    emit();
  }
}

export function useTopDialogHost(): HTMLElement | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => hosts[hosts.length - 1] ?? null,
  );
}
