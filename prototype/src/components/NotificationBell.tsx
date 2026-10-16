import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAccount } from '../auth/AuthContext';
import { markAllNotificationsRead, markNotificationRead, useAppState } from '../data/store';
import type { AppNotification, NotificationKind } from '../data/types';
import { formatDateTime, formatRelative, toDayKey } from '../lib/date';
import { useNow } from '../lib/hooks';

type Filter = 'all' | NotificationKind;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'registration', label: 'Registrations' },
  { id: 'tea', label: 'Tea orders' },
];
const MAX_ITEMS = 50;

export function NotificationBell() {
  const state = useAppState();
  const account = useAccount();
  const navigate = useNavigate();
  const now = useNow(60000);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [ringing, setRinging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const seenIds = useRef<Set<string> | null>(null);

  const unreadCount = state.notifications.filter((n) => !n.readBy.includes(account.id)).length;
  const items = state.notifications.filter((n) => filter === 'all' || n.kind === filter).slice(0, MAX_ITEMS);

  // Registrations are in-app only: animate the bell and announce politely. Tea orders announce via the popup.
  useEffect(() => {
    const ids = new Set(state.notifications.map((n) => n.id));
    if (seenIds.current) {
      const fresh = state.notifications.filter((n) => !seenIds.current!.has(n.id) && n.kind === 'registration');
      if (fresh.length > 0) {
        setAnnouncement(`New notification: ${fresh[0].title}. ${fresh[0].body}`);
        setRinging(true);
        const t = window.setTimeout(() => setRinging(false), 1600);
        seenIds.current = ids;
        return () => window.clearTimeout(t);
      }
    }
    seenIds.current = ids;
    return undefined;
  }, [state.notifications]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleItem = (n: AppNotification) => {
    markNotificationRead(n.id, account.id);
    if (n.kind === 'registration' && n.registrationId) {
      const reg = state.registrations.find((r) => r.id === n.registrationId);
      if (!reg) return;
      setOpen(false);
      navigate(`/portal?view=day&date=${toDayKey(new Date(reg.visitAt))}&visit=${reg.id}`);
    }
  };

  return (
    <div className="notif" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        id="notification-button"
        className={`icon-btn notif__button${ringing ? ' notif__button--ring' : ''}`}
        aria-expanded={open}
        aria-controls="notification-panel"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications, none unread'}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && <span className="notif__badge" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div id="notification-panel" className="notif-panel" role="dialog" aria-modal="false" aria-labelledby="notification-panel-title">
          <div className="notif-panel__head">
            <h2 id="notification-panel-title" className="notif-panel__title">Notifications</h2>
            <button
              type="button"
              className="link-button"
              onClick={() => markAllNotificationsRead(account.id)}
              disabled={unreadCount === 0}
              id="mark-all-read"
            >
              Mark all as read
            </button>
          </div>
          <div className="segmented segmented--small notif-panel__filters" role="group" aria-label="Filter notifications">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="segmented__btn"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                id={`notif-filter-${f.id}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {items.length === 0 ? (
            <p className="empty-state">No notifications.</p>
          ) : (
            <ul className="notif-list" aria-label="Notification list">
              {items.map((n) => {
                const unread = !n.readBy.includes(account.id);
                const order = n.kind === 'tea' ? state.teaOrders.find((o) => o.id === n.teaOrderId) : undefined;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`notif-item kind-${n.kind}${unread ? ' notif-item--unread' : ''}`}
                      onClick={() => handleItem(n)}
                      aria-describedby={`notif-time-${n.id}`}
                    >
                      <span className="notif-item__dot" aria-hidden="true" />
                      <span className="notif-item__content">
                        <span className="notif-item__kind">{n.kind === 'tea' ? 'Tea order' : 'Registration'}</span>
                        <span className="notif-item__title">
                          {unread && <span className="sr-only">Unread. </span>}
                          {n.title}
                        </span>
                        <span className="notif-item__body">{n.body}</span>
                        {order?.note && <span className="notif-item__extra">{`Note: ${order.note}`}</span>}
                        <time id={`notif-time-${n.id}`} className="notif-item__time" dateTime={n.createdAt} title={formatDateTime(new Date(n.createdAt))}>
                          {formatRelative(new Date(n.createdAt), now)}
                        </time>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </div>
  );
}
