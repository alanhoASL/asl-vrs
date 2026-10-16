import { useEffect, useRef } from 'react';
import { hourLabel, hourRange } from './hours';
import { STATUS_LABELS, TYPE_LABELS } from '../../data/catalog';
import { overallState } from '../../data/status';
import type { Registration } from '../../data/types';
import { formatLongDate, formatTime, isSameDay, minutesOfDay, toDayKey } from '../../lib/date';

interface Props {
  date: Date;
  now: Date;
  events: Registration[];
  onOpen: (id: string) => void;
  /** Changing this scrolls back to the current-time line, e.g. when Today is pressed again. */
  scrollToNowKey: number;
}

export function DayView({ date, now, events, onOpen, scrollToNowKey }: Props) {
  const hours = hourRange(events);
  const nowLineRef = useRef<HTMLLIElement>(null);
  const isToday = isSameDay(date, now);
  const nowHour = now.getHours();
  const nowMinutes = minutesOfDay(now);
  const linePlacement = !isToday ? null
    : nowHour < hours[0] ? 'before'
      : nowHour > hours[hours.length - 1] ? 'after'
        : 'inside';
  const dayKey = toDayKey(date);

  // Not keyed on the minute tick, so staff who scroll away are not pulled back every minute.
  useEffect(() => {
    if (!isToday) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Wait a frame so the rest of the page has laid out, e.g. right after sign-in redirects here.
    const frame = requestAnimationFrame(() => {
      nowLineRef.current?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
  }, [isToday, dayKey, scrollToNowKey]);

  const nowLine = (
    <li className="now-line" id="now-line" ref={nowLineRef} aria-current="time">
      <span className="now-line__label">
        <span className="sr-only">Current time, </span>
        {`Now ${formatTime(now)}`}
      </span>
    </li>
  );

  const card = (r: Registration) => (
    <li key={r.id}>
      <DayCard registration={r} onOpen={onOpen} />
    </li>
  );

  return (
    <section className="day-view" id="calendar-day" aria-label={`Registrations on ${formatLongDate(date)}`}>
      {events.length === 0 && <p className="empty-state">No registrations on this day.</p>}
      <ol className="day-timeline">
        {linePlacement === 'before' && nowLine}
        {hours.map((h) => {
          const slot = events.filter((r) => new Date(r.visitAt).getHours() === h);
          const lineHere = linePlacement === 'inside' && h === nowHour;
          const due = lineHere ? slot.filter((r) => minutesOfDay(new Date(r.visitAt)) <= nowMinutes) : slot;
          const upcoming = lineHere ? slot.filter((r) => minutesOfDay(new Date(r.visitAt)) > nowMinutes) : [];
          return (
            <li key={h} className={`day-slot${slot.length || lineHere ? '' : ' day-slot--empty'}`}>
              <span className="day-slot__time">{hourLabel(h)}</span>
              {slot.length > 0 || lineHere ? (
                <ul className="day-slot__events">
                  {due.map(card)}
                  {lineHere && nowLine}
                  {upcoming.map(card)}
                </ul>
              ) : (
                <span className="sr-only">No registrations</span>
              )}
            </li>
          );
        })}
        {linePlacement === 'after' && nowLine}
      </ol>
    </section>
  );
}

function DayCard({ registration: r, onOpen }: { registration: Registration; onOpen: (id: string) => void }) {
  const titleId = `day-card-${r.id}`;
  return (
    <article className={`day-card type-${r.type} state-${overallState(r)}`} aria-labelledby={titleId}>
      <div className="day-card__top">
        <span className="day-card__time">{formatTime(new Date(r.visitAt))}</span>
        <span className={`type-badge type-badge--${r.type}`}>{TYPE_LABELS[r.type].long}</span>
      </div>
      <h3 className="day-card__title" id={titleId}>
        <button type="button" className="day-card__open" onClick={() => onOpen(r.id)}>
          {r.company}
          <span className="sr-only">, open details</span>
        </button>
      </h3>
      <p className="day-card__meta">
        <span>Host <strong>{r.hostStaff}</strong></span>
        {r.purpose && <span>Work <strong>{r.purpose}</strong></span>}
        {r.floor && <span>Floor <strong>{r.floor}</strong></span>}
      </p>
      <ul className="day-card__visitors" aria-label="Visitors">
        {r.visitors.map((v) => (
          <li key={v.id}>
            <span>{v.name}</span>
            <span className={`status-pill status-pill--${v.status}`}>{STATUS_LABELS[v.status]}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
