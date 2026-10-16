import { EventChip } from './EventChip';
import { hourLabel, hourRange } from './hours';
import type { Registration } from '../../data/types';
import { useMediaQuery } from '../../lib/hooks';
import {
  addDays, formatLongDate, formatWeekRange, isSameDay, startOfWeek, toDayKey, WEEKDAYS_SHORT,
} from '../../lib/date';

interface Props {
  date: Date;
  today: Date;
  byDay: Map<string, Registration[]>;
  onOpen: (id: string) => void;
  onSelectDay: (day: Date) => void;
}

export function WeekView({ date, today, byDay, onOpen, onSelectDay }: Props) {
  const narrow = useMediaQuery('(max-width: 760px)');
  const start = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const weekEvents = days.flatMap((d) => byDay.get(toDayKey(d)) ?? []);

  if (narrow) {
    return (
      <ol className="week-list" id="calendar-week" aria-label={`Registrations for the week of ${formatWeekRange(start)}`}>
        {days.map((day) => {
          const events = byDay.get(toDayKey(day)) ?? [];
          const isToday = isSameDay(day, today);
          return (
            <li key={toDayKey(day)} className={`week-list__day${isToday ? ' week-list__day--today' : ''}`} aria-current={isToday ? 'date' : undefined}>
              <h3 className="week-list__heading">
                <button type="button" className="link-button" onClick={() => onSelectDay(day)} aria-label={`${formatLongDate(day)}. Open day view`}>
                  {formatLongDate(day)}
                  {isToday && <span className="today-tag">Today</span>}
                </button>
              </h3>
              {events.length === 0 ? (
                <p className="muted week-list__empty">No registrations</p>
              ) : (
                <ul className="week-list__events">
                  {events.map((r) => (
                    <li key={r.id}>
                      <EventChip registration={r} onOpen={onOpen} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    );
  }

  const hours = hourRange(weekEvents);
  return (
    <div className="week-grid-wrap">
      <table className="week-grid" id="calendar-week">
        <caption className="sr-only">{`Registrations for the week of ${formatWeekRange(start)}`}</caption>
        <thead>
          <tr>
            <th scope="col" className="week-grid__corner"><span className="sr-only">Time</span></th>
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <th scope="col" key={toDayKey(day)} className={isToday ? 'week-grid__day--today' : undefined} aria-current={isToday ? 'date' : undefined}>
                  <button type="button" className="week-grid__day-btn" onClick={() => onSelectDay(day)} aria-label={`${formatLongDate(day)}${isToday ? ', today' : ''}. Open day view`}>
                    <span className="week-grid__dow">{WEEKDAYS_SHORT[i]}</span>
                    <span className="week-grid__date">{day.getDate()}</span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => (
            <tr key={h}>
              <th scope="row" className="week-grid__hour">{hourLabel(h)}</th>
              {days.map((day) => {
                const events = (byDay.get(toDayKey(day)) ?? []).filter((r) => new Date(r.visitAt).getHours() === h);
                return (
                  <td key={toDayKey(day)} className={isSameDay(day, today) ? 'week-grid__cell--today' : undefined}>
                    {events.length > 0 && (
                      <ul className="week-grid__events">
                        {events.map((r) => (
                          <li key={r.id}>
                            <EventChip registration={r} onOpen={onOpen} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
