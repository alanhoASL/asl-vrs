import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { DismissVisitorsDialog, PrintLabelsDialog, type DismissRequest, type PrintRequest } from './VisitorActionDialogs';
import { useAccount } from '../auth/AuthContext';
import { STATUS_LABELS, TYPE_LABELS } from '../data/catalog';
import { confirmVisitor, confirmVisitors, dismissVisitors, printVisitorLabels } from '../data/store';
import { canConfirm, canDismiss, canPrint } from '../data/visitorRules';
import type { Registration, Visitor } from '../data/types';
import { formatDateTime } from '../lib/date';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

interface Props {
  registration: Registration | null;
  open: boolean;
  onClose: () => void;
}

export function VisitDrawer({ registration, open, onClose }: Props) {
  const account = useAccount();
  const [printItems, setPrintItems] = useState<PrintRequest[]>([]);
  const [dismissItems, setDismissItems] = useState<DismissRequest[]>([]);
  const [dismissSkipped, setDismissSkipped] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const visitors = registration?.visitors ?? [];
  const selectable = visitors.filter((v) => v.status !== 'dismissed');
  const selectedVisitors = selectable.filter((v) => selected.has(v.id));
  const confirmable = selectedVisitors.filter(canConfirm);
  const dismissable = selectedVisitors.filter(canDismiss);
  const printable = selectedVisitors.filter(canPrint);
  const allSelected = selectable.length > 0 && selectable.every((v) => selected.has(v.id));
  const allowedKey = selectable.map((v) => v.id).join('|');

  useEffect(() => {
    if (!focusId) return;
    document.getElementById(focusId)?.focus();
    setFocusId(null);
  }, [focusId, registration]);

  useEffect(() => {
    const allow = new Set(allowedKey ? allowedKey.split('|') : []);
    setSelected((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (allow.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [allowedKey]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedVisitors.length > 0 && !allSelected;
    }
  }, [selectedVisitors.length, allSelected]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = (v: Visitor) => {
    if (!registration) return;
    confirmVisitor(registration.id, v.id, account);
    setAnnouncement(`${v.name} confirmed.`);
    setFocusId(`print-${v.id}`);
  };

  const handleBatchConfirm = () => {
    if (!registration || confirmable.length === 0) return;
    const names = confirmVisitors(
      confirmable.map((v) => ({ registrationId: registration.id, visitorId: v.id })),
      account,
    );
    setAnnouncement(names.length === 1 ? `${names[0]} confirmed.` : `Confirmed ${names.length} visitors: ${names.join(', ')}.`);
    setFocusId(printable.length > 0 ? 'drawer-batch-print' : 'drawer-select-all');
  };

  const openDismiss = (items: DismissRequest[], skipped: number) => {
    setDismissItems(items);
    setDismissSkipped(skipped);
  };

  const handleDismiss = () => {
    if (!registration || dismissItems.length === 0) return;
    const names = dismissVisitors(
      dismissItems.map((item) => ({ registrationId: item.registrationId, visitorId: item.id })),
      account,
    );
    setAnnouncement(names.length === 1 ? `${names[0]} dismissed.` : `Dismissed ${names.length} visitors: ${names.join(', ')}.`);
    const dismissedIds = new Set(dismissItems.map((item) => item.id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => !dismissedIds.has(id)));
      return next;
    });
    setDismissItems([]);
    setDismissSkipped(0);
    const remaining = visitors.some((v) => v.status !== 'dismissed' && !dismissedIds.has(v.id));
    setFocusId(remaining ? 'drawer-select-all' : 'close-visit-drawer');
  };

  const handlePrint = () => {
    if (printItems.length === 0) return;
    const names = printVisitorLabels(
      printItems.map((item) => ({ registrationId: item.registration.id, visitorId: item.visitor.id })),
      account,
    );
    const reprint = printItems.every((item) => item.visitor.printCount > 0);
    const verb = reprint ? 'Reprint' : 'Print';
    setAnnouncement(names.length === 1
      ? `${verb} recorded for ${names[0]}.`
      : `${verb} recorded for ${names.length} visitors: ${names.join(', ')}.`);
    setPrintItems([]);
  };

  const isVendor = registration?.type === 'vendor';
  const printBatchLabel = printable.length > 0 && printable.every((v) => v.printCount > 0) ? 'Reprint label' : 'Print label';

  return (
    <>
      <Modal open={open} onClose={onClose} labelledBy="visit-drawer-title" id="visit-drawer" variant="drawer">
        {!registration ? (
          <div className="drawer">
            <div className="drawer__head">
              <h2 id="visit-drawer-title" className="drawer__title">Visit not found</h2>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Close visit details">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <p>This registration no longer exists. It may have been removed by a demo data reset.</p>
          </div>
        ) : (
          <div className={`drawer type-${registration.type}`}>
            <div className="drawer__head">
              <div>
                <span className={`type-badge type-badge--${registration.type}`}>{TYPE_LABELS[registration.type].long}</span>
                <h2 id="visit-drawer-title" className="drawer__title">{registration.company}</h2>
              </div>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Close visit details" id="close-visit-drawer">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <dl className="detail-list">
              <div>
                <dt>{registration.type === 'guest-prereg' ? 'Planned date / time' : 'Registered at'}</dt>
                <dd>{formatDateTime(new Date(registration.visitAt))}</dd>
              </div>
              <div>
                <dt>Host staff</dt>
                <dd>{registration.hostStaff}</dd>
              </div>
              {registration.hostContact && (
                <div>
                  <dt>Host contact</dt>
                  <dd>{registration.hostContact}</dd>
                </div>
              )}
              {isVendor && (
                <>
                  <div>
                    <dt>Purpose / work</dt>
                    <dd>{registration.purpose}</dd>
                  </div>
                  <div>
                    <dt>Destination floor</dt>
                    <dd>{registration.floor ?? <span className="muted">Not provided</span>}</dd>
                  </div>
                </>
              )}
              <div>
                <dt>Form submitted</dt>
                <dd>{formatDateTime(new Date(registration.submittedAt))}</dd>
              </div>
            </dl>

            <section aria-labelledby="visitors-heading" className="drawer__section">
              <h3 id="visitors-heading" className="drawer__section-title">
                Visitors ({registration.visitors.length})
              </h3>
              {selectable.length > 0 && (
                <div className="batch-bar" role="group" aria-label="Batch actions for this visit">
                  <div className="batch-bar__select">
                    <input
                      ref={selectAllRef}
                      id="drawer-select-all"
                      className="check"
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => {
                        setSelected(allSelected ? new Set() : new Set(selectable.map((v) => v.id)));
                      }}
                    />
                    <label htmlFor="drawer-select-all">Select all</label>
                  </div>
                  <div className="batch-bar__actions">
                    <span className="batch-bar__count">{`${selectedVisitors.length} selected`}</span>
                    <button
                      type="button"
                      className="btn btn-primary btn-small"
                      id="drawer-batch-confirm"
                      disabled={confirmable.length === 0}
                      onClick={handleBatchConfirm}
                    >
                      {confirmable.length > 0 ? `Confirm (${confirmable.length})` : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-small"
                      id="drawer-batch-dismiss"
                      disabled={dismissable.length === 0}
                      onClick={() => openDismiss(
                        dismissable.map((v) => ({ id: v.id, registrationId: registration.id, name: v.name })),
                        selectedVisitors.length - dismissable.length,
                      )}
                    >
                      {dismissable.length > 0 ? `Dismiss (${dismissable.length})` : 'Dismiss'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-soft btn-small"
                      id="drawer-batch-print"
                      disabled={printable.length === 0}
                      onClick={() => setPrintItems(printable.map((v) => ({ registration, visitor: v })))}
                    >
                      {printable.length > 0 ? `${printBatchLabel} (${printable.length})` : 'Print label'}
                    </button>
                  </div>
                </div>
              )}
              <ul className="visitor-list">
                {registration.visitors.map((v) => (
                  <li key={v.id} className={`visitor-card status-${v.status}`}>
                    <div className="visitor-card__layout">
                      <div className="visitor-card__check">
                        <input
                          type="checkbox"
                          className="check"
                          checked={selected.has(v.id)}
                          disabled={v.status === 'dismissed'}
                          onChange={() => toggle(v.id)}
                          aria-label={`Select ${v.name}`}
                          id={`select-${v.id}`}
                        />
                      </div>
                      <div className="visitor-card__body">
                        <div className="visitor-card__top">
                          <div className="visitor-card__who">
                            <span className="visitor-card__avatar" aria-hidden="true">{initials(v.name)}</span>
                            <div>
                              <p id={`visitor-name-${v.id}`} className="visitor-card__name">{v.name}</p>
                              {v.idFirst4 && (
                                <p className="visitor-card__meta">
                                  HKID / staff card first 4: <strong>{v.idFirst4}</strong>
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={`status-pill status-pill--${v.status}`}>{STATUS_LABELS[v.status]}</span>
                        </div>

                        {v.status !== 'dismissed' && (v.confirmedAt || v.lastPrintedAt) && (
                          <p className="visitor-card__meta">
                            {v.confirmedAt && `Confirmed by ${v.confirmedBy} at ${formatDateTime(new Date(v.confirmedAt))}. `}
                            {!v.confirmedAt && v.lastPrintedAt && 'Not confirmed yet. '}
                            {v.lastPrintedAt && `Label printed ${v.printCount === 1 ? 'once' : `${v.printCount} times`}, last at ${formatDateTime(new Date(v.lastPrintedAt))}.`}
                          </p>
                        )}

                        {v.status === 'dismissed' ? (
                          <p className="visitor-card__meta">
                            {v.printCount > 0
                              ? `Dismissed as a duplicate or mistaken entry. A label was printed ${v.printCount === 1 ? 'once' : `${v.printCount} times`} before dismissal.`
                              : 'Dismissed as a duplicate or mistaken entry. No label.'}
                          </p>
                        ) : (
                          <div className="visitor-card__actions">
                            {canConfirm(v) && (
                              <button
                                type="button"
                                className="btn btn-primary btn-small"
                                onClick={() => handleConfirm(v)}
                                id={`confirm-${v.id}`}
                                aria-label={`Confirm ${v.name}`}
                              >
                                Confirm
                              </button>
                            )}
                            {canDismiss(v) && (
                              <button
                                type="button"
                                className="btn btn-outline btn-small"
                                onClick={() => openDismiss([{ id: v.id, registrationId: registration.id, name: v.name }], 0)}
                                id={`dismiss-${v.id}`}
                                aria-label={`Dismiss ${v.name}`}
                              >
                                Dismiss
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-soft btn-small"
                              onClick={() => setPrintItems([{ registration, visitor: v }])}
                              id={`print-${v.id}`}
                              aria-label={`${v.printCount > 0 ? 'Reprint label' : 'Print label'} for ${v.name}`}
                            >
                              {v.printCount > 0 ? 'Reprint label' : 'Print label'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
          </div>
        )}
      </Modal>

      <PrintLabelsDialog items={printItems} onClose={() => setPrintItems([])} onConfirm={handlePrint} />
      <DismissVisitorsDialog
        items={dismissItems}
        skipped={dismissSkipped}
        onClose={() => { setDismissItems([]); setDismissSkipped(0); }}
        onConfirm={handleDismiss}
      />
    </>
  );
}
