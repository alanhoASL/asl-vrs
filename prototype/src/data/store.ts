import { useSyncExternalStore } from 'react';
import { createSeedState, STATE_VERSION } from './seed';
import { describeRegistration, describeTeaOrder, registrationTitle } from './describe';
import { canConfirm, canDismiss, canPrint } from './visitorRules';
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
  hostContact: string;
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
    hostContact: input.hostContact,
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

export interface VisitorTarget {
  registrationId: string;
  visitorId: string;
}

/** Applies one action to many visitors in a single save. Returns the names it actually changed, in target order. */
function applyToVisitors(
  targets: VisitorTarget[],
  account: Account,
  change: (v: Visitor) => { visitor: Visitor; action: AuditAction } | null,
): string[] {
  if (targets.length === 0) return [];
  const wanted = new Set(targets.map((t) => `${t.registrationId}\n${t.visitorId}`));
  const nameByKey = new Map<string, string>();
  for (const r of state.registrations) {
    for (const v of r.visitors) nameByKey.set(`${r.id}\n${v.id}`, v.name);
  }
  const applied = new Set<string>();
  commit((s) => {
    applied.clear();
    const audits: { registrationId: string; visitorId: string; action: AuditAction; detail: string }[] = [];
    const registrations = s.registrations.map((r) => ({
      ...r,
      visitors: r.visitors.map((v) => {
        const key = `${r.id}\n${v.id}`;
        if (!wanted.has(key)) return v;
        const result = change(v);
        if (!result) return v;
        applied.add(key);
        audits.push({ registrationId: r.id, visitorId: v.id, action: result.action, detail: v.name });
        return result.visitor;
      }),
    }));
    if (audits.length === 0) return s;
    let next: AppState = { ...s, registrations };
    for (const entry of audits) {
      next = appendAudit(next, account, entry.action, {
        registrationId: entry.registrationId,
        visitorId: entry.visitorId,
        detail: entry.detail,
      });
    }
    return next;
  });
  return targets
    .map((t) => `${t.registrationId}\n${t.visitorId}`)
    .filter((key) => applied.has(key))
    .map((key) => nameByKey.get(key) ?? 'Visitor');
}

export function confirmVisitors(targets: VisitorTarget[], account: Account): string[] {
  const now = new Date().toISOString();
  return applyToVisitors(targets, account, (v) => {
    if (!canConfirm(v)) return null;
    const printed = v.status === 'printed' || v.printCount > 0;
    return {
      action: 'Confirm',
      visitor: {
        ...v,
        status: printed ? 'printed' : 'confirmed',
        confirmedBy: account.displayName,
        confirmedAt: now,
      },
    };
  });
}

export function confirmVisitor(registrationId: string, visitorId: string, account: Account) {
  confirmVisitors([{ registrationId, visitorId }], account);
}

export function dismissVisitors(targets: VisitorTarget[], account: Account): string[] {
  return applyToVisitors(targets, account, (v) => (canDismiss(v) ? {
    action: 'Dismiss',
    visitor: { ...v, status: 'dismissed' },
  } : null));
}

export function dismissVisitor(registrationId: string, visitorId: string, account: Account) {
  dismissVisitors([{ registrationId, visitorId }], account);
}

/** No printer is connected in the prototype; this only records the print. Confirm is not required. */
export function printVisitorLabels(targets: VisitorTarget[], account: Account): string[] {
  const now = new Date().toISOString();
  return applyToVisitors(targets, account, (v) => {
    if (!canPrint(v)) return null;
    const reprint = v.printCount > 0;
    return {
      action: reprint ? 'Reprint label' : 'Print label',
      visitor: { ...v, status: 'printed', printCount: v.printCount + 1, lastPrintedAt: now },
    };
  });
}

export function printVisitorLabel(registrationId: string, visitorId: string, account: Account) {
  printVisitorLabels([{ registrationId, visitorId }], account);
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

/** Reception has taken the order. It does not pop up again for anyone. */
export function confirmTeaOrder(orderId: string, account: Account) {
  const now = new Date().toISOString();
  commit((s) => {
    const next: AppState = {
      ...s,
      teaOrders: s.teaOrders.map((order) => (order.id === orderId && !order.confirmedAt
        ? { ...order, confirmedAt: now, confirmedBy: account.displayName }
        : order)),
      notifications: s.notifications.map((n) => (n.teaOrderId !== orderId ? n : {
        ...n,
        readBy: n.readBy.includes(account.id) ? n.readBy : [...n.readBy, account.id],
        popupClosedBy: n.popupClosedBy.includes(account.id) ? n.popupClosedBy : [...n.popupClosedBy, account.id],
      })),
    };
    return appendAudit(next, account, 'Confirm tea order', { detail: orderId });
  });
}

/** Reception completes or corrects the vendor purpose and floor after the public form is submitted. */
export function updateVendorVisit(
  registrationId: string,
  patch: { purpose: string; floor: string },
  account: Account,
) {
  const purpose = patch.purpose.trim();
  const floor = patch.floor.trim();
  if (!purpose) return false;
  commit((s) => {
    const current = s.registrations.find((r) => r.id === registrationId && r.type === 'vendor');
    if (!current) return s;
    const next: AppState = {
      ...s,
      registrations: s.registrations.map((r) => (r.id !== registrationId ? r : {
        ...r,
        purpose,
        floor: floor || undefined,
      })),
    };
    return appendAudit(next, account, 'Update visit', { registrationId, detail: purpose });
  });
  return true;
}

export function resetDemoData() {
  commit(() => createSeedState());
}
