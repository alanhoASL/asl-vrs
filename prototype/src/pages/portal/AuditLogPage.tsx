import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ACCOUNTS, TYPE_LABELS } from '../../data/catalog';
import { useAppState } from '../../data/store';
import type { AuditAction } from '../../data/types';
import { formatDateTime, toDayKey } from '../../lib/date';

const ACTIONS: AuditAction[] = ['Confirm', 'Dismiss', 'Print label', 'Reprint label', 'Sign in', 'Sign out'];
const PAGE_SIZE = 50;

export function AuditLogPage() {
  const state = useAppState();
  const [action, setAction] = useState<'all' | AuditAction>('all');
  const [accountId, setAccountId] = useState('all');
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    document.title = 'Audit log - ASL Visitor Registration';
  }, []);

  const registrations = useMemo(() => new Map(state.registrations.map((r) => [r.id, r])), [state.registrations]);
  const rows = state.audit.filter((a) => (action === 'all' || a.action === action) && (accountId === 'all' || a.accountId === accountId));
  const shown = rows.slice(0, limit);

  return (
    <div className="audit-page">
      <div className="page-head">
        <h1 className="page-title">Audit log</h1>
        <p className="page-subtitle">Read-only record of sign-ins and visit actions. Visible to Super Admin only.</p>
      </div>

      <div className="audit-filters">
        <div className="field field--inline">
          <label htmlFor="audit-action" className="field__label">Action</label>
          <select id="audit-action" className="input input--small" value={action} onChange={(e) => { setAction(e.target.value as 'all' | AuditAction); setLimit(PAGE_SIZE); }}>
            <option value="all">All actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="field field--inline">
          <label htmlFor="audit-account" className="field__label">Staff account</label>
          <select id="audit-account" className="input input--small" value={accountId} onChange={(e) => { setAccountId(e.target.value); setLimit(PAGE_SIZE); }}>
            <option value="all">All accounts</option>
            {ACCOUNTS.map((a) => <option key={a.id} value={a.id}>{a.displayName}</option>)}
          </select>
        </div>
        <p className="audit-count" role="status" aria-live="polite">{`${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`}</p>
      </div>

      <div className="table-wrap">
        <table className="data-table" id="audit-table">
          <caption className="sr-only">Audit log entries, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Staff</th>
              <th scope="col">Action</th>
              <th scope="col">Visit</th>
              <th scope="col">Visitor</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => {
              const reg = a.registrationId ? registrations.get(a.registrationId) : undefined;
              return (
                <tr key={a.id}>
                  <td data-label="Time"><time dateTime={a.at}>{formatDateTime(new Date(a.at))}</time></td>
                  <td data-label="Staff">{a.accountName}</td>
                  <td data-label="Action"><span className={`action-tag action-tag--${a.action.toLowerCase().replace(/\s+/g, '-')}`}>{a.action}</span></td>
                  <td data-label="Visit">
                    {reg ? (
                      <Link to={`/portal?view=day&date=${toDayKey(new Date(reg.visitAt))}&visit=${reg.id}`}>
                        {reg.company}
                        <span className="muted">{` (${TYPE_LABELS[reg.type].short})`}</span>
                      </Link>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                  <td data-label="Visitor">{a.detail ?? <span className="muted">-</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <button type="button" className="btn btn-outline audit-more" onClick={() => setLimit((l) => l + PAGE_SIZE)} id="audit-show-more">
          {`Show ${Math.min(PAGE_SIZE, rows.length - limit)} more`}
        </button>
      )}
    </div>
  );
}
