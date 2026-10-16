import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '../../data/store';
import { downloadTeaReport, ordersInRange, summarize } from '../../data/teaReport';
import { addDays, formatDate, parseDayKey, startOfDay, toDayKey } from '../../lib/date';

export function TeaReportPage() {
  const state = useAppState();
  const today = startOfDay(new Date());
  const [fromValue, setFromValue] = useState(() => toDayKey(addDays(today, -29)));
  const [toValue, setToValue] = useState(() => toDayKey(today));
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    document.title = 'Tea report - ASL Visitor Registration';
  }, []);

  const from = parseDayKey(fromValue);
  const to = parseDayKey(toValue);
  const rangeError = !from || !to
    ? 'Choose both a start date and an end date.'
    : from > to ? 'The start date must be on or before the end date.' : '';

  const orders = useMemo(
    () => (from && to && !rangeError ? ordersInRange(state.teaOrders, from, to) : []),
    // fromValue/toValue stand in for the Date objects, which are new on every render.
    [state.teaOrders, fromValue, toValue, rangeError],
  );
  const summary = useMemo(() => summarize(orders), [orders]);
  const maxRoomOrders = Math.max(1, ...summary.byRoom.map((r) => r.orders));
  const maxDrinkQty = Math.max(1, ...summary.byDrink.map((d) => d.quantity));
  const busiestRoom = summary.totalOrders > 0 ? summary.byRoom[0] : null;
  const topDrink = summary.totalOrders > 0 ? summary.byDrink[0] : null;

  const handleDownload = async () => {
    if (!from || !to || rangeError) return;
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadTeaReport(orders, from, to);
    } catch {
      setDownloadError('The Excel file could not be created. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const downloadDisabledReason = rangeError
    ? rangeError
    : orders.length === 0 ? 'There are no tea orders in this date range.' : '';

  return (
    <div className="report-page">
      <div className="page-head">
        <h1 className="page-title">Tea service report</h1>
        <p className="page-subtitle">
          Counts orders placed through the room QR codes. There is no delivered status, so these are not delivery totals.
          Visible to Super Admin only.
        </p>
      </div>

      <div className="report-filters">
        <div className="field field--inline">
          <label htmlFor="report-from" className="field__label">From</label>
          <input
            id="report-from"
            type="date"
            className="input input--small"
            value={fromValue}
            max={toValue || undefined}
            onChange={(e) => setFromValue(e.target.value)}
            aria-invalid={rangeError ? true : undefined}
            aria-describedby={rangeError ? 'report-range-error' : undefined}
          />
        </div>
        <div className="field field--inline">
          <label htmlFor="report-to" className="field__label">To</label>
          <input
            id="report-to"
            type="date"
            className="input input--small"
            value={toValue}
            min={fromValue || undefined}
            onChange={(e) => setToValue(e.target.value)}
            aria-invalid={rangeError ? true : undefined}
            aria-describedby={rangeError ? 'report-range-error' : undefined}
          />
        </div>
        <div className="report-filters__action">
          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={handleDownload}
            disabled={Boolean(downloadDisabledReason) || downloading}
            aria-describedby={downloadDisabledReason ? 'report-download-hint' : undefined}
            id="report-download"
          >
            {downloading ? 'Preparing file...' : 'Download Excel (.xlsx)'}
          </button>
        </div>
      </div>
      {rangeError && <p id="report-range-error" className="field__error" role="alert">{rangeError}</p>}
      {!rangeError && downloadDisabledReason && (
        <p id="report-download-hint" className="field__hint">{downloadDisabledReason}</p>
      )}
      {downloadError && <p className="field__error" role="alert">{downloadError}</p>}

      {!rangeError && from && to && (
        <>
          <p className="report-range" role="status" aria-live="polite">
            {`${formatDate(from)} to ${formatDate(to)}: ${summary.totalOrders} ${summary.totalOrders === 1 ? 'order' : 'orders'}, ${summary.totalItems} ${summary.totalItems === 1 ? 'item' : 'items'}`}
          </p>

          <dl className="report-stats">
            <div className="report-stat">
              <dt>Orders</dt>
              <dd>{summary.totalOrders}</dd>
            </div>
            <div className="report-stat">
              <dt>Items</dt>
              <dd>{summary.totalItems}</dd>
            </div>
            <div className="report-stat">
              <dt>Most used room</dt>
              <dd>{busiestRoom ? `${busiestRoom.roomName} (${busiestRoom.orders})` : '-'}</dd>
            </div>
            <div className="report-stat">
              <dt>Most ordered drink</dt>
              <dd>
                {topDrink
                  ? `${topDrink.drinkName}${topDrink.optionName ? ` (${topDrink.optionName})` : ''} x ${topDrink.quantity}`
                  : '-'}
              </dd>
            </div>
          </dl>

          <div className="report-tables">
            <section aria-labelledby="report-rooms-title">
              <h2 id="report-rooms-title" className="report-section-title">By room</h2>
              <div className="table-wrap">
                <table className="data-table" id="report-rooms">
                  <caption className="sr-only">Tea orders by room, most used first</caption>
                  <thead>
                    <tr>
                      <th scope="col">Room</th>
                      <th scope="col" className="num">Orders</th>
                      <th scope="col" className="num">Items</th>
                      <th scope="col"><span className="sr-only">Share of orders</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byRoom.map((r) => (
                      <tr key={r.roomName}>
                        <td data-label="Room">{r.roomName}</td>
                        <td data-label="Orders" className="num">{r.orders}</td>
                        <td data-label="Items" className="num">{r.items}</td>
                        <td className="bar-cell" aria-hidden="true">
                          {r.orders > 0 && <span className="bar" style={{ width: `${(r.orders / maxRoomOrders) * 100}%` }} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="report-drinks-title">
              <h2 id="report-drinks-title" className="report-section-title">By drink</h2>
              <div className="table-wrap">
                <table className="data-table" id="report-drinks">
                  <caption className="sr-only">Drinks ordered, most ordered first</caption>
                  <thead>
                    <tr>
                      <th scope="col">Drink</th>
                      <th scope="col">Option</th>
                      <th scope="col" className="num">Quantity</th>
                      <th scope="col" className="num">Orders</th>
                      <th scope="col"><span className="sr-only">Share of quantity</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byDrink.map((d) => (
                      <tr key={`${d.drinkName}|${d.optionName}`}>
                        <td data-label="Drink">{d.drinkName}</td>
                        <td data-label="Option">{d.optionName || <span className="muted">-</span>}</td>
                        <td data-label="Quantity" className="num">{d.quantity}</td>
                        <td data-label="Orders" className="num">{d.orders}</td>
                        <td className="bar-cell" aria-hidden="true">
                          {d.quantity > 0 && <span className="bar" style={{ width: `${(d.quantity / maxDrinkQty) * 100}%` }} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <p className="field__hint report-footnote">
            The Excel file has four sheets: every order line (date, time, room, drink, option, quantity, note), plus totals by
            room, by drink and by day.
          </p>
        </>
      )}
    </div>
  );
}
