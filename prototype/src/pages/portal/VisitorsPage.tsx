import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { DismissVisitorsDialog, PrintLabelsDialog, type DismissRequest, type PrintRequest } from '../../components/VisitorActionDialogs';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../../components/icons';
import { useAccount } from '../../auth/AuthContext';
import { STATUS_LABELS, TYPE_LABELS } from '../../data/catalog';
import { confirmVisitors, dismissVisitors, printVisitorLabels, useAppState } from '../../data/store';
import { canConfirm, canDismiss, canPrint } from '../../data/visitorRules';
import type { Registration, Visitor, VisitorStatus } from '../../data/types';
import { addDays, formatLongDate, formatTime, parseDayKey, startOfDay, toDayKey } from '../../lib/date';
import { useNow } from '../../lib/hooks';

const STATUS_ORDER: VisitorStatus[] = ['expected', 'confirmed', 'printed', 'dismissed'];

interface Row {
  registration: Registration;
  visitor: Visitor;
}

export function VisitorsPage() {
  const state = useAppState();
  const account = useAccount();
  const canOperate = account.role !== 'superadmin';
  const now = useNow(30000);
  const today = startOfDay(now);
  const [params, setParams] = useSearchParams();
  const date = parseDayKey(params.get('date')) ?? today;
  const dayKey = toDayKey(date);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VisitorStatus>('all');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [printItems, setPrintItems] = useState<PrintRequest[]>([]);
  const [dismissItems, setDismissItems] = useState<DismissRequest[]>([]);
  const [dismissSkipped, setDismissSkipped] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Visitors - ASL Visitor Registration';
  }, []);

  const go = (next: Date) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set('date', toDayKey(next));
    setParams(nextParams);
  };

  const dayRows = useMemo(() => {
    const list: Row[] = [];
    for (const registration of state.registrations) {
      if (toDayKey(new Date(registration.visitAt)) !== dayKey) continue;
      for (const visitor of registration.visitors) list.push({ registration, visitor });
    }
    list.sort((a, b) => a.registration.visitAt.localeCompare(b.registration.visitAt)
      || a.visitor.name.localeCompare(b.visitor.name));
    return list;
  }, [state.registrations, dayKey]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dayRows.filter(({ registration: r, visitor: v }) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (!q) return true;
      return [v.name, r.company, r.hostStaff, r.hostContact ?? '', r.purpose ?? '']
        .some((text) => text.toLowerCase().includes(q));
    });
  }, [dayRows, query, statusFilter]);

  const selectable = rows.filter((r) => r.visitor.status !== 'dismissed');
  const allowedKey = selectable.map((r) => r.visitor.id).join('|');
  const selectedRows = selectable.filter((r) => selected.has(r.visitor.id));
  const confirmable = selectedRows.filter((r) => canConfirm(r.visitor));
  const dismissable = selectedRows.filter((r) => canDismiss(r.visitor));
  const printable = selectedRows.filter((r) => canPrint(r.visitor));
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.visitor.id));
  const printBatchLabel = printable.length > 0 && printable.every((r) => r.visitor.printCount > 0)
    ? 'Reprint label'
    : 'Print label';

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
      selectAllRef.current.indeterminate = selectedRows.length > 0 && !allSelected;
    }
  }, [selectedRows.length, allSelected]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchConfirm = () => {
    if (confirmable.length === 0) return;
    const names = confirmVisitors(
      confirmable.map((r) => ({ registrationId: r.registration.id, visitorId: r.visitor.id })),
      account,
    );
    setAnnouncement(names.length === 1 ? `${names[0]} confirmed.` : `Confirmed ${names.length} visitors: ${names.join(', ')}.`);
    document.getElementById('visitors-select-all')?.focus();
  };

  const handleDismiss = () => {
    if (dismissItems.length === 0) return;
    const names = dismissVisitors(
      dismissItems.map((item) => ({ registrationId: item.registrationId, visitorId: item.id })),
      account,
    );
    setAnnouncement(names.length === 1 ? `${names[0]} dismissed.` : `Dismissed ${names.length} visitors: ${names.join(', ')}.`);
    setDismissItems([]);
    setDismissSkipped(0);
    document.getElementById('visitors-select-all')?.focus();
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

  const openDismiss = () => {
    setDismissItems(dismissable.map((r) => ({
      id: r.visitor.id,
      registrationId: r.registration.id,
      name: r.visitor.name,
      company: r.registration.company,
    })));
    setDismissSkipped(selectedRows.length - dismissable.length);
  };

  const emptyText = dayRows.length === 0 ? 'No visitors on this day.' : 'No visitors match this search.';

  return (
    <div className="visitors-page">
      <div className="page-head">
        <h1 className="page-title">Visitor management</h1>
        <p className="page-subtitle">
          {canOperate
            ? 'Select visitors to confirm, dismiss, or print labels together. Printing does not confirm a visitor, so a label can be printed first and confirmed later.'
            : 'A record of visitors for the selected day.'}
        </p>
      </div>

      <div className="visitors-toolbar">
        <div className="date-picker">
          <button type="button" className="btn btn-outline btn-small btn-icon" onClick={() => go(addDays(date, -1))} aria-label="Previous day" id="visitors-prev">
            <ChevronLeftIcon />
          </button>
          <div className="date-picker__control">
            <span className="date-picker__text" aria-hidden="true">{formatLongDate(date)}</span>
            <span className="date-picker__icon" aria-hidden="true"><CalendarIcon /></span>
            <input
              id="visitors-date"
              type="date"
              className="date-picker__input"
              value={dayKey}
              aria-label={`Date, ${formatLongDate(date)}`}
              onChange={(event) => {
                const next = parseDayKey(event.target.value);
                if (next) go(next);
              }}
            />
          </div>
          <button type="button" className="btn btn-outline btn-small btn-icon" onClick={() => go(addDays(date, 1))} aria-label="Next day" id="visitors-next">
            <ChevronRightIcon />
          </button>
          <button type="button" className="btn btn-outline btn-small" onClick={() => go(today)} id="visitors-today">
            Today
          </button>
        </div>
        <p className="visitors-count" role="status">
          {`${rows.length} ${rows.length === 1 ? 'visitor' : 'visitors'}`}
        </p>
      </div>

      <div className="visitors-filters">
        <div className="field field--inline visitors-search">
          <label htmlFor="visitors-search" className="field__label">Search</label>
          <input
            id="visitors-search"
            type="search"
            className="input input--small"
            placeholder="Name, company, host or phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field field--inline">
          <label htmlFor="visitors-status" className="field__label">Status</label>
          <select
            id="visitors-status"
            className="input input--small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | VisitorStatus)}
          >
            <option value="all">All statuses</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      {canOperate && rows.length > 0 && (
        <div className="batch-bar" role="group" aria-label="Batch actions">
          <div className="batch-bar__select">
            <input
              ref={selectAllRef}
              id="visitors-select-all"
              className="check"
              type="checkbox"
              checked={allSelected}
              disabled={selectable.length === 0}
              onChange={() => {
                setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.visitor.id)));
              }}
            />
            <label htmlFor="visitors-select-all">Select all</label>
          </div>
          <div className="batch-bar__actions">
            <span className="batch-bar__count">{`${selectedRows.length} selected`}</span>
            <button
              type="button"
              className="btn btn-primary btn-small"
              id="visitors-batch-confirm"
              disabled={confirmable.length === 0}
              onClick={handleBatchConfirm}
            >
              {confirmable.length > 0 ? `Confirm (${confirmable.length})` : 'Confirm'}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-small"
              id="visitors-batch-dismiss"
              disabled={dismissable.length === 0}
              onClick={openDismiss}
            >
              {dismissable.length > 0 ? `Dismiss (${dismissable.length})` : 'Dismiss'}
            </button>
            <button
              type="button"
              className="btn btn-soft btn-small"
              id="visitors-batch-print"
              disabled={printable.length === 0}
              onClick={() => setPrintItems(printable.map((r) => ({ registration: r.registration, visitor: r.visitor })))}
            >
              {printable.length > 0 ? `${printBatchLabel} (${printable.length})` : 'Print label'}
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="empty-state">{emptyText}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table" id="visitors-table">
            <caption className="sr-only">{`Visitors on ${formatLongDate(date)}`}</caption>
            <thead>
              <tr>
                {canOperate && <th scope="col" className="col-check"><span className="sr-only">Select</span></th>}
                <th scope="col">Visitor</th>
                <th scope="col">Company</th>
                <th scope="col">Time</th>
                <th scope="col">Host</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ registration: r, visitor: v }) => (
                <tr key={v.id}>
                  {canOperate && (
                    <td data-label="Select" className="col-check">
                      <input
                        type="checkbox"
                        className="check"
                        checked={selected.has(v.id)}
                        disabled={v.status === 'dismissed'}
                        onChange={() => toggle(v.id)}
                        aria-label={`Select ${v.name}, ${r.company}`}
                        id={`visitors-select-${v.id}`}
                      />
                    </td>
                  )}
                  <td data-label="Visitor">
                    <Link to={`/portal?view=day&date=${dayKey}&visit=${r.id}`}>{v.name}</Link>
                  </td>
                  <td data-label="Company">{r.company}</td>
                  <td data-label="Time">{formatTime(new Date(r.visitAt))}</td>
                  <td data-label="Host">
                    <span>{r.hostStaff}</span>
                    {r.hostContact && (
                      <>
                        <br />
                        {r.hostContact}
                      </>
                    )}
                  </td>
                  <td data-label="Type">
                    <span className={`type-badge type-badge--${r.type}`}>{TYPE_LABELS[r.type].short}</span>
                  </td>
                  <td data-label="Status">
                    <span className={`status-pill status-pill--${v.status}`}>{STATUS_LABELS[v.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canOperate && (
        <>
          <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
          <PrintLabelsDialog items={printItems} onClose={() => setPrintItems([])} onConfirm={handlePrint} />
          <DismissVisitorsDialog
            items={dismissItems}
            skipped={dismissSkipped}
            onClose={() => { setDismissItems([]); setDismissSkipped(0); }}
            onConfirm={handleDismiss}
          />
        </>
      )}
    </div>
  );
}
