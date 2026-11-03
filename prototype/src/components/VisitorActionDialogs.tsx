import { Modal } from './Modal';
import { LabelPreview } from './LabelPreview';
import type { Registration, Visitor } from '../data/types';

export interface PrintRequest {
  registration: Registration;
  visitor: Visitor;
}

export interface DismissRequest {
  /** Visitor id. */
  id: string;
  registrationId: string;
  name: string;
  company?: string;
}

function printTitle(items: PrintRequest[]): string {
  const reprints = items.filter((i) => i.visitor.printCount > 0).length;
  if (items.length === 1) return reprints === 1 ? 'Reprint label' : 'Print label';
  if (reprints === items.length) return `Reprint ${items.length} labels`;
  return `Print ${items.length} labels`;
}

function printButton(items: PrintRequest[]): string {
  const reprints = items.filter((i) => i.visitor.printCount > 0).length;
  if (items.length === 1) return reprints === 1 ? 'Reprint' : 'Print';
  if (reprints === items.length) return `Reprint ${items.length}`;
  return `Print ${items.length}`;
}

export function PrintLabelsDialog({
  items, onClose, onConfirm,
}: {
  items: PrintRequest[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const multipleCompanies = new Set(items.map((i) => i.registration.id)).size > 1;
  return (
    <Modal
      open={items.length > 0}
      onClose={onClose}
      labelledBy="print-dialog-title"
      describedBy="print-dialog-desc"
      id="print-dialog"
    >
      {items.length > 0 && (
        <div className="modal-body">
          <h2 id="print-dialog-title" className="modal-title">{printTitle(items)}</h2>
          {items.length === 1 ? (
            <LabelPreview registration={items[0].registration} visitor={items[0].visitor} />
          ) : (
            <ul className="name-list" aria-label="Labels to print">
              {items.map((item) => (
                <li key={item.visitor.id}>
                  <span>{item.visitor.name}</span>
                  {multipleCompanies && <span className="muted">{` — ${item.registration.company}`}</span>}
                  {item.visitor.printCount > 0 && <span className="muted"> (reprint)</span>}
                </li>
              ))}
            </ul>
          )}
          <p id="print-dialog-desc" className="notice">
            No printer is connected in this prototype. Print records the action only. A connected printer would output the inner label only, 34 mm × 65 mm.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} id="print-cancel">
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={onConfirm} id="print-confirm">
              {printButton(items)}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function DismissVisitorsDialog({
  items, skipped, onClose, onConfirm,
}: {
  items: DismissRequest[];
  skipped: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const title = items.length === 1 ? `Dismiss ${items[0]?.name}?` : `Dismiss ${items.length} visitors?`;
  const multipleCompanies = items.some((i) => i.company);
  return (
    <Modal
      open={items.length > 0}
      onClose={onClose}
      labelledBy="dismiss-dialog-title"
      describedBy="dismiss-dialog-desc"
      id="dismiss-dialog"
    >
      {items.length > 0 && (
        <div className="modal-body">
          <h2 id="dismiss-dialog-title" className="modal-title">{title}</h2>
          <p id="dismiss-dialog-desc">
            Use this for a duplicate or mistaken entry. It does not turn the person away, and it cannot be undone.
          </p>
          {items.length > 1 && (
            <ul className="name-list" aria-label="Visitors to dismiss">
              {items.map((item) => (
                <li key={item.id}>
                  <span>{item.name}</span>
                  {multipleCompanies && item.company && <span className="muted">{` — ${item.company}`}</span>}
                </li>
              ))}
            </ul>
          )}
          {skipped > 0 && (
            <p className="muted">
              {skipped === 1
                ? '1 selected visitor is already confirmed and will not be dismissed.'
                : `${skipped} selected visitors are already confirmed and will not be dismissed.`}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} id="dismiss-cancel">
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={onConfirm} id="dismiss-confirm">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
