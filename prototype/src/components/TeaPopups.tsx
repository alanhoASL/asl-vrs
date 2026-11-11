import { createPortal } from 'react-dom';
import { useAccount } from '../auth/AuthContext';
import { useTopDialogHost } from './dialogStack';
import { DRINKS, ROOMS } from '../data/catalog';
import { confirmTeaOrder, useAppState } from '../data/store';
import { formatTime } from '../lib/date';
import type { TeaLine } from '../data/types';

function lineText(line: TeaLine): string {
  const drink = DRINKS.find((item) => item.id === line.drinkId);
  const name = drink?.nameZh ?? line.drinkName;
  const unit = drink?.unitZh ?? line.unit;
  const note = drink?.noteZh ?? '';
  const detail = [unit, note].filter(Boolean).join('，');
  return `${line.quantity} x ${name}（${detail}）`;
}

/** Reception only. Chinese, and gone for good once a receptionist confirms the order. */
export function TeaPopups() {
  const state = useAppState();
  const account = useAccount();
  const dialogHost = useTopDialogHost();
  if (account.role !== 'reception') return null;

  const popups = state.notifications.filter((n) => {
    if (n.kind !== 'tea' || !n.teaOrderId) return false;
    const order = state.teaOrders.find((item) => item.id === n.teaOrderId);
    return !!order && !order.confirmedAt;
  });
  if (popups.length === 0) return null;

  return createPortal(
    <section className="popup-stack" aria-label="茶水訂單提示" aria-live="assertive" aria-relevant="additions" id="tea-popups" lang="zh-Hant-HK">
      {popups.length > 1 && (
        <button
          type="button"
          className="btn btn-outline btn-small popup-stack__close-all"
          onClick={() => popups.forEach((n) => n.teaOrderId && confirmTeaOrder(n.teaOrderId, account))}
          id="close-all-tea-popups"
        >
          {`全部確認（${popups.length}）`}
        </button>
      )}
      {popups.map((n) => {
        const order = state.teaOrders.find((item) => item.id === n.teaOrderId);
        if (!order) return null;
        const room = ROOMS.find((item) => item.id === order.roomId);
        const roomName = room?.nameZh ?? order.roomName;
        const titleId = `popup-title-${n.id}`;
        return (
          <article key={n.id} className="popup" aria-labelledby={titleId}>
            <div className="popup__head">
              <span className="popup__eyebrow">新茶水訂單</span>
              <time className="popup__time" dateTime={order.createdAt}>{formatTime(new Date(order.createdAt))}</time>
            </div>
            <h2 id={titleId} className="popup__title">{roomName}</h2>
            <ul className="popup__lines">
              {order.lines.map((line) => (
                <li key={line.drinkId}>{lineText(line)}</li>
              ))}
            </ul>
            {order.note && <p className="popup__meta">{`備註：${order.note}`}</p>}
            <div className="popup__foot">
              <span className="popup__hint">請聯絡茶水間。</span>
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={() => confirmTeaOrder(order.id, account)}
                aria-label={`確認${roomName}的茶水訂單`}
                id={`confirm-popup-${n.id}`}
              >
                確認
              </button>
            </div>
          </article>
        );
      })}
    </section>,
    dialogHost ?? document.body,
  );
}
