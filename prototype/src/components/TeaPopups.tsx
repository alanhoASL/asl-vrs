import { createPortal } from 'react-dom';
import { useAccount } from '../auth/AuthContext';
import { useTopDialogHost } from './dialogStack';
import { closeTeaPopup, useAppState } from '../data/store';
import { teaLineName } from '../data/describe';
import { formatTime } from '../lib/date';

/** Tea orders are the only notifications that pop up; they stay until closed. */
export function TeaPopups() {
  const state = useAppState();
  const account = useAccount();
  const dialogHost = useTopDialogHost();
  const popups = state.notifications.filter((n) => n.kind === 'tea' && !n.popupClosedBy.includes(account.id));

  return createPortal(
    <section className="popup-stack" aria-label="Tea order alerts" aria-live="assertive" aria-relevant="additions" id="tea-popups">
      {popups.length > 1 && (
        <button
          type="button"
          className="btn btn-outline btn-small popup-stack__close-all"
          onClick={() => popups.forEach((n) => closeTeaPopup(n.id, account.id))}
          id="close-all-tea-popups"
        >
          {`Close all ${popups.length} tea alerts`}
        </button>
      )}
      {popups.map((n) => {
        const order = state.teaOrders.find((o) => o.id === n.teaOrderId);
        if (!order) return null;
        const titleId = `popup-title-${n.id}`;
        return (
          <article key={n.id} className="popup" aria-labelledby={titleId}>
            <div className="popup__head">
              <span className="popup__eyebrow">New tea order</span>
              <time className="popup__time" dateTime={order.createdAt}>{formatTime(new Date(order.createdAt))}</time>
            </div>
            <h2 id={titleId} className="popup__title">{order.roomName}</h2>
            <ul className="popup__lines">
              {order.lines.map((l) => (
                <li key={`${l.drinkId}-${l.optionId ?? ''}`}>
                  <span className="popup__qty">{`${l.quantity} x`}</span> {teaLineName(l)}
                </li>
              ))}
            </ul>
            {order.note && <p className="popup__meta">{`Note: ${order.note}`}</p>}
            <div className="popup__foot">
              <span className="popup__hint">Please contact the pantry.</span>
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={() => closeTeaPopup(n.id, account.id)}
                aria-label={`Close tea order alert for ${order.roomName}`}
                id={`close-popup-${n.id}`}
              >
                Close
              </button>
            </div>
          </article>
        );
      })}
    </section>,
    dialogHost ?? document.body,
  );
}
