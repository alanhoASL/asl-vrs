import { useSyncExternalStore } from 'react';
import { createSeedState, STATE_VERSION } from './seed';
import { describeRegistration, describeTeaOrder, registrationTitle } from './describe';
import type {
  Account, AppNotification, AppState, AuditAction, Registration, RegistrationType, TeaLine, TeaOrder, Visitor,
} from './types';

const STORAGE_KEY = 'asl-vrs-prototype-state';

const listeners = new Set<() => void>();
let state: AppState = load();

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === STATE_VERSION) return parsed;
    }
  } catch {
    // Corrupt or unreadable storage falls through to a fresh seed.
  }
  const fresh = createSeedState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

function emit() {
  listeners.forEach((l) => l());
}

function commit(update: (s: AppState) => AppState) {
  state = update(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emit();
}

// Other tabs (public forms, tea page, second portal window) write to the same key.
window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY) return;
  state = e.newValue ? (JSON.parse(e.newValue) as AppState) : load();
  emit();
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state);
}

/** crypto.randomUUID is unavailable on plain http LAN addresses, which is how phones reach the dev server. */
function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export interface RegistrationInput {
  type: RegistrationType;
  company: string;
  hostStaff: string;
  /** Only used for pre-registration; ad hoc and vendor use the submission time. */
  plannedAt?: Date;
  purpose?: string;
  floor?: string;
  visitors: { name: string; idFirst4?: string }[];
}

export function submitRegistration(input: RegistrationInput) {
  const now = new Date();
  const visitAt = input.type === 'guest-prereg' && input.plannedAt ? input.plannedAt : now;
  const registration: Registration = {
    id: newId('reg'),
    type: input.type,
    company: input.company,
    hostStaff: input.hostStaff,
    visitAt: visitAt.toISOString(),
    submittedAt: now.toISOString(),
    visitors: input.visitors.map<Visitor>((v) => ({
      id: newId('vis'),
      name: v.name,
      idFirst4: v.idFirst4,
      status: 'expected',
      printCount: 0,
    })),
  };
  if (input.type === 'vendor') {
    registration.purpose = input.purpose;
    if (input.floor) registration.floor = input.floor;
  }

  const notification: AppNotification = {
    id: newId('ntf'),
    kind: 'registration',
    title: registrationTitle(registration.type),
    body: describeRegistration(registration),
    createdAt: registration.submittedAt,
    registrationId: registration.id,
    readBy: [],
    popupClosedBy: [],
  };

  commit((s) => ({
    ...s,
    registrations: [...s.registrations, registration],
    notifications: [notification, ...s.notifications],
  }));
}

export interface TeaOrderInput {
  roomId: string;
  roomName: string;
  lines: TeaLine[];
  note?: string;
}

export function submitTeaOrder(input: TeaOrderInput) {
  const order: TeaOrder = { id: newId('tea'), createdAt: new Date().toISOString(), ...input };
  const notification: AppNotification = {
    id: newId('ntf'),
    kind: 'tea',
    title: `Tea order for ${order.roomName}`,
    body: describeTeaOrder(order),
    createdAt: order.createdAt,
    teaOrderId: order.id,
    readBy: [],
    popupClosedBy: [],
  };
  commit((s) => ({
    ...s,
    teaOrders: [...s.teaOrders, order],
    notifications: [notification, ...s.notifications],
  }));
}

function appendAudit(
  s: AppState,
  account: Account,
  action: AuditAction,
  extra: { registrationId?: string; visitorId?: string; detail?: string } = {},
): AppState {
  const entry = { id: newId('audit'), at: new Date().toISOString(), accountId: account.id, accountName: account.displayName, action, ...extra };
  return { ...s, audit: [entry, ...s.audit] };
}

export function recordSession(account: Account, action: 'Sign in' | 'Sign out') {
  commit((s) => appendAudit(s, account, action));
}

function updateVisitor(
  registrationId: string,
  visitorId: string,
  account: Account,
  change: (v: Visitor) => { visitor: Visitor; action: AuditAction } | null,
) {
  commit((s) => {
    let auditAction: AuditAction | null = null;
    let visitorName = '';
    const registrations = s.registrations.map((r) => {
      if (r.id !== registrationId) return r;
      return {
        ...r,
        visitors: r.visitors.map((v) => {
          if (v.id !== visitorId) return v;
          const result = change(v);
          if (!result) return v;
          auditAction = result.action;
          visitorName = v.name;
          return result.visitor;
        }),
      };
    });
    if (!auditAction) return s;
    return appendAudit({ ...s, registrations }, account, auditAction, { registrationId, visitorId, detail: visitorName });
  });
}

export function confirmVisitor(registrationId: string, visitorId: string, account: Account) {
  updateVisitor(registrationId, visitorId, account, (v) => (v.status !== 'expected' ? null : {
    action: 'Confirm',
    visitor: { ...v, status: 'confirmed', confirmedBy: account.displayName, confirmedAt: new Date().toISOString() },
  }));
}

export function dismissVisitor(registrationId: string, visitorId: string, account: Account) {
  updateVisitor(registrationId, visitorId, account, (v) => (v.status !== 'expected' ? null : {
    action: 'Dismiss',
    visitor: { ...v, status: 'dismissed' },
  }));
}

/** No printer is connected in the prototype; this only records the print. */
export function printVisitorLabel(registrationId: string, visitorId: string, account: Account) {
  updateVisitor(registrationId, visitorId, account, (v) => {
    if (v.status !== 'confirmed' && v.status !== 'printed') return null;
    return {
      action: v.printCount > 0 ? 'Reprint label' : 'Print label',
      visitor: { ...v, status: 'printed', printCount: v.printCount + 1, lastPrintedAt: new Date().toISOString() },
    };
  });
}

export function markNotificationRead(id: string, accountId: string) {
  commit((s) => ({
    ...s,
    notifications: s.notifications.map((n) => (n.id === id && !n.readBy.includes(accountId)
      ? { ...n, readBy: [...n.readBy, accountId] }
      : n)),
  }));
}

export function markAllNotificationsRead(accountId: string) {
  commit((s) => ({
    ...s,
    notifications: s.notifications.map((n) => (n.readBy.includes(accountId) ? n : { ...n, readBy: [...n.readBy, accountId] })),
  }));
}

/** Closing a tea popup also marks it read for that account. */
export function closeTeaPopup(id: string, accountId: string) {
  commit((s) => ({
    ...s,
    notifications: s.notifications.map((n) => (n.id !== id ? n : {
      ...n,
      popupClosedBy: n.popupClosedBy.includes(accountId) ? n.popupClosedBy : [...n.popupClosedBy, accountId],
      readBy: n.readBy.includes(accountId) ? n.readBy : [...n.readBy, accountId],
    })),
  }));
}

export function resetDemoData() {
  commit(() => createSeedState());
}
