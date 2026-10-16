import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { LabelPreview } from './LabelPreview';
import { useAccount } from '../auth/AuthContext';
import { STATUS_LABELS, TYPE_LABELS } from '../data/catalog';
import { confirmVisitor, dismissVisitor, printVisitorLabel } from '../data/store';
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
  const [printTargetId, setPrintTargetId] = useState<string | null>(null);
  const [dismissTargetId, setDismissTargetId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);

  // Confirm and Dismiss remove the button that had focus, so move focus to the next useful control.
  useEffect(() => {
    if (!focusId) return;
    document.getElementById(focusId)?.focus();
    setFocusId(null);
  }, [focusId, registration]);

  const printTarget = registration?.visitors.find((v) => v.id === printTargetId) ?? null;
  const dismissTarget = registration?.visitors.find((v) => v.id === dismissTargetId) ?? null;

  const handleConfirm = (v: Visitor) => {
    if (!registration) return;
    confirmVisitor(registration.id, v.id, account);
    setAnnouncement(`${v.name} confirmed.`);
    setFocusId(`print-${v.id}`);
  };

  const handleDismiss = () => {
    if (!registration || !dismissTarget) return;
    dismissVisitor(registration.id, dismissTarget.id, account);
    setAnnouncement(`${dismissTarget.name} dismissed.`);
    setDismissTargetId(null);
    setFocusId('close-visit-drawer');
  };

  const handlePrint = () => {
    if (!registration || !printTarget) return;
    const reprint = printTarget.printCount > 0;
    printVisitorLabel(registration.id, printTarget.id, account);
    setAnnouncement(`${reprint ? 'Reprint' : 'Print'} recorded for ${printTarget.name}.`);
    setPrintTargetId(null);
  };

  const isVendor = registration?.type === 'vendor';

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
              <ul className="visitor-list">
                {registration.visitors.map((v) => {
                  const printHintId = `print-hint-${v.id}`;
                  return (
                    <li key={v.id} className={`visitor-card status-${v.status}`}>
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

                      {(v.confirmedAt || v.lastPrintedAt) && (
                        <p className="visitor-card__meta">
                          {v.confirmedAt && `Confirmed by ${v.confirmedBy} at ${formatDateTime(new Date(v.confirmedAt))}.`}
                          {v.lastPrintedAt && ` Label printed ${v.printCount === 1 ? 'once' : `${v.printCount} times`}, last at ${formatDateTime(new Date(v.lastPrintedAt))}.`}
                        </p>
                      )}

                      {v.status === 'dismissed' ? (
                        <p className="visitor-card__meta">Dismissed as a duplicate or mistaken entry. No label.</p>
                      ) : (
                        <div className="visitor-card__actions">
                          {v.status === 'expected' && (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-small"
                                onClick={() => handleConfirm(v)}
                                id={`confirm-${v.id}`}
                                aria-label={`Confirm ${v.name}`}
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline btn-small"
                                onClick={() => setDismissTargetId(v.id)}
                                id={`dismiss-${v.id}`}
                                aria-label={`Dismiss ${v.name}`}
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn btn-soft btn-small"
                            onClick={() => setPrintTargetId(v.id)}
                            disabled={v.status === 'expected'}
                            aria-describedby={v.status === 'expected' ? printHintId : undefined}
                            id={`print-${v.id}`}
                            aria-label={`${v.printCount > 0 ? 'Reprint label' : 'Print label'} for ${v.name}`}
                          >
                            {v.printCount > 0 ? 'Reprint label' : 'Print label'}
                          </button>
                          {v.status === 'expected' && (
                            <p id={printHintId} className="visitor-card__hint">Confirm this visitor before printing a label.</p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
            <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!printTarget && !!registration}
        onClose={() => setPrintTargetId(null)}
        labelledBy="print-dialog-title"
        describedBy="print-dialog-desc"
        id="print-dialog"
      >
        {printTarget && registration && (
          <div className="modal-body">
            <h2 id="print-dialog-title" className="modal-title">
              {printTarget.printCount > 0 ? 'Reprint label' : 'Print label'}
            </h2>
            <LabelPreview registration={registration} visitor={printTarget} />
            <p id="print-dialog-desc" className="notice">
              No printer is connected in this prototype. Selecting Print records the action in the audit log only.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setPrintTargetId(null)} id="print-cancel">
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handlePrint} id="print-confirm">
                {printTarget.printCount > 0 ? 'Reprint' : 'Print'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!dismissTarget}
        onClose={() => setDismissTargetId(null)}
        labelledBy="dismiss-dialog-title"
        describedBy="dismiss-dialog-desc"
        id="dismiss-dialog"
      >
        {dismissTarget && (
          <div className="modal-body">
            <h2 id="dismiss-dialog-title" className="modal-title">{`Dismiss ${dismissTarget.name}?`}</h2>
            <p id="dismiss-dialog-desc">
              Use this for a duplicate or mistaken entry. It does not turn the person away, and it cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setDismissTargetId(null)} id="dismiss-cancel">
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDismiss} id="dismiss-confirm">
                Dismiss
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
