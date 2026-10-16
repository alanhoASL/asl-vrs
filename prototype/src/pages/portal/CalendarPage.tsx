import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { MonthView } from '../../components/calendar/MonthView';
import { WeekView } from '../../components/calendar/WeekView';
import { DayView } from '../../components/calendar/DayView';
import { VisitDrawer } from '../../components/VisitDrawer';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '../../components/icons';
import { STATUS_LABELS, TYPE_LABELS } from '../../data/catalog';
import { useAppState } from '../../data/store';
import type { Registration, RegistrationType, VisitorStatus } from '../../data/types';
import {
  addDays, addMonths, formatLongDate, formatMonthYear, formatWeekRange, parseDayKey, startOfDay, startOfWeek, toDayKey,
} from '../../lib/date';
import { useNow } from '../../lib/hooks';

type View = 'day' | 'week' | 'month';
const VIEWS: { id: View; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];
const TYPES: RegistrationType[] = ['guest-prereg', 'guest-adhoc', 'vendor'];
const STATUS_ORDER: VisitorStatus[] = ['expected', 'confirmed', 'printed', 'dismissed'];

function matchesQuery(r: Registration, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [r.company, r.hostStaff, r.purpose ?? '', ...r.visitors.map((v) => v.name)]
    .some((text) => text.toLowerCase().includes(needle));
}

export function CalendarPage() {
  const state = useAppState();
  const now = useNow(30000);
  const today = startOfDay(now);
  const [params, setParams] = useSearchParams();

  const viewParam = params.get('view');
  const view: View = viewParam === 'week' || viewParam === 'month' ? viewParam : 'day';
  const date = parseDayKey(params.get('date')) ?? today;
  const visitId = params.get('visit');

  const [typeFilter, setTypeFilter] = useState<Record<RegistrationType, boolean>>({
    'guest-prereg': true, 'guest-adhoc': true, vendor: true,
  });
  const [query, setQuery] = useState('');
  const [scrollToNowKey, setScrollToNowKey] = useState(0);

  useEffect(() => {
    document.title = 'Calendar - ASL Visitor Registration';
  }, []);

  const filtered = useMemo(
    () => state.registrations
      .filter((r) => typeFilter[r.type] && matchesQuery(r, query.trim()))
      .sort((a, b) => a.visitAt.localeCompare(b.visitAt)),
    [state.registrations, typeFilter, query],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Registration[]>();
    for (const r of filtered) {
      const key = toDayKey(new Date(r.visitAt));
      const list = map.get(key);
      if (list) list.push(r);
      else map.set(key, [r]);
    }
    return map;
  }, [filtered]);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setParams(next);
  };

  const go = (nextView: View, nextDate: Date) => update({ view: nextView, date: toDayKey(nextDate) });
  const openVisit = (id: string) => update({ visit: id });
  const closeVisit = () => update({ visit: null });

  const step = (dir: 1 | -1) => {
    if (view === 'month') go(view, addMonths(date, dir));
    else if (view === 'week') go(view, addDays(date, 7 * dir));
    else go(view, addDays(date, dir));
  };

  const title = view === 'month'
    ? formatMonthYear(date)
    : view === 'week'
      ? formatWeekRange(startOfWeek(date))
      : formatLongDate(date);

  const rangeEvents = useMemo(() => {
    let start: Date;
    let endExclusive: Date;
    if (view === 'month') {
      start = new Date(date.getFullYear(), date.getMonth(), 1);
      endExclusive = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    } else if (view === 'week') {
      start = startOfWeek(date);
      endExclusive = addDays(start, 7);
    } else {
      start = startOfDay(date);
      endExclusive = addDays(start, 1);
    }
    return filtered.filter((r) => {
      const t = new Date(r.visitAt);
      return t >= start && t < endExclusive;
    });
  }, [filtered, view, date]);

  const visitorTotal = rangeEvents.reduce((sum, r) => sum + r.visitors.length, 0);
  const statusCounts = rangeEvents.flatMap((r) => r.visitors).reduce<Record<VisitorStatus, number>>(
    (acc, v) => ({ ...acc, [v.status]: acc[v.status] + 1 }),
    { expected: 0, confirmed: 0, printed: 0, dismissed: 0 },
  );
  const selected = visitId ? state.registrations.find((r) => r.id === visitId) ?? null : null;

  return (
    <div className="calendar-page">
      <section className="calendar-panel" aria-label="Calendar controls">
      <div className="calendar-toolbar">
        <div className="calendar-toolbar__title-group">
          <h1 className="calendar-title" id="calendar-title">{title}</h1>
          <p className="calendar-summary" role="status" aria-live="polite">
            {`${rangeEvents.length} ${rangeEvents.length === 1 ? 'registration' : 'registrations'}, ${visitorTotal} ${visitorTotal === 1 ? 'visitor' : 'visitors'} this ${view}`}
          </p>
        </div>
        <div className="calendar-toolbar__controls">
          <div className="btn-group" role="group" aria-label="Change period">
            <button type="button" className="btn btn-outline btn-small btn-icon" onClick={() => step(-1)} aria-label={`Previous ${view}`} id="calendar-prev">
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              className="btn btn-outline btn-small"
              onClick={() => {
                go(view, today);
                setScrollToNowKey((k) => k + 1);
              }}
              id="calendar-today"
            >
              Today
            </button>
            <button type="button" className="btn btn-outline btn-small btn-icon" onClick={() => step(1)} aria-label={`Next ${view}`} id="calendar-next">
              <ChevronRightIcon />
            </button>
          </div>
          <div className="segmented" role="group" aria-label="Calendar view">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                className="segmented__btn"
                aria-pressed={view === v.id}
                onClick={() => go(v.id, date)}
                id={`view-${v.id}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ul className="status-summary" aria-label={`Visitor status this ${view}`}>
        {STATUS_ORDER.map((s) => (
          <li key={s} className={`status-summary__item status-summary__item--${s}`}>
            <span className="status-summary__count">{statusCounts[s]}</span>
            <span className="status-summary__label">{STATUS_LABELS[s]}</span>
          </li>
        ))}
      </ul>

      <div className="calendar-filters">
        <fieldset className="type-filter">
          <legend className="sr-only">Show registration types</legend>
          {TYPES.map((t) => (
            <label key={t} className={`type-filter__item type-${t}`} htmlFor={`filter-${t}`}>
              <input
                type="checkbox"
                id={`filter-${t}`}
                checked={typeFilter[t]}
                onChange={(e) => setTypeFilter((prev) => ({ ...prev, [t]: e.target.checked }))}
              />
              <span className="type-filter__swatch" aria-hidden="true" />
              {TYPE_LABELS[t].long}
            </label>
          ))}
        </fieldset>
        <div className="calendar-search">
          <label htmlFor="calendar-search" className="sr-only">Search by visitor, company or host</label>
          <span className="calendar-search__icon"><SearchIcon /></span>
          <input
            id="calendar-search"
            type="search"
            className="input input--small"
            placeholder="Search visitor, company or host"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      </section>

      <div className="calendar-body" aria-labelledby="calendar-title" role="region">
        {view === 'month' && (
          <MonthView date={date} today={today} byDay={byDay} onOpen={openVisit} onSelectDay={(d) => go('day', d)} />
        )}
        {view === 'week' && (
          <WeekView date={date} today={today} byDay={byDay} onOpen={openVisit} onSelectDay={(d) => go('day', d)} />
        )}
        {view === 'day' && (
          <DayView date={date} now={now} events={rangeEvents} onOpen={openVisit} scrollToNowKey={scrollToNowKey} />
        )}
      </div>

      <VisitDrawer registration={selected} open={!!visitId} onClose={closeVisit} />
    </div>
  );
}
