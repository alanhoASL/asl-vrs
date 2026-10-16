export type RegistrationType = 'guest-prereg' | 'guest-adhoc' | 'vendor';

export type VisitorStatus = 'expected' | 'confirmed' | 'printed' | 'dismissed';

export type Role = 'reception' | 'superadmin';

export interface Account {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: Role;
}

export interface Visitor {
  id: string;
  name: string;
  /** Vendor only: first 4 characters of HKID or staff card. */
  idFirst4?: string;
  status: VisitorStatus;
  confirmedBy?: string;
  confirmedAt?: string;
  printCount: number;
  lastPrintedAt?: string;
}

export interface Registration {
  id: string;
  type: RegistrationType;
  company: string;
  hostStaff: string;
  /** Planned time for pre-registration, submission time for ad hoc and vendor. ISO string. */
  visitAt: string;
  submittedAt: string;
  /** Vendor only. */
  purpose?: string;
  /** Vendor only, optional. */
  floor?: string;
  visitors: Visitor[];
}

export interface TeaLine {
  drinkId: string;
  drinkName: string;
  optionId?: string;
  optionName?: string;
  quantity: number;
}

export interface TeaOrder {
  id: string;
  roomId: string;
  roomName: string;
  lines: TeaLine[];
  note?: string;
  createdAt: string;
}

export type NotificationKind = 'registration' | 'tea';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  registrationId?: string;
  teaOrderId?: string;
  readBy: string[];
  /** Tea orders only: accounts that have closed the popup. */
  popupClosedBy: string[];
}

export type AuditAction = 'Sign in' | 'Sign out' | 'Confirm' | 'Dismiss' | 'Print label' | 'Reprint label';

export interface AuditEntry {
  id: string;
  at: string;
  accountId: string;
  accountName: string;
  action: AuditAction;
  registrationId?: string;
  visitorId?: string;
  detail?: string;
}

export interface AppState {
  version: number;
  registrations: Registration[];
  teaOrders: TeaOrder[];
  notifications: AppNotification[];
  audit: AuditEntry[];
}
