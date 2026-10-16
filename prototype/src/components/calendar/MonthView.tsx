import { EventChip } from './EventChip';
import type { Registration } from '../../data/types';
import {
  addDays, formatLongDate, formatMonthYear, isSameDay, startOfWeek, toDayKey, WEEKDAYS_SHORT,
} from '../../lib/date';

const MAX_CHIPS = 3;
const WEEKDAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Props {
  date: Date;
  today: Date;
  byDay: Map<string, Registration[]>;
  onOpen: (id: string) => void;
  onSelectDay: (day: Date) => void;
}

export function MonthView({ date, today, byDay, onOpen, onSelectDay }: Props) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const gridStart = startOfWeek(first);
  const gridEnd = addDays(startOfWeek(last), 6);

  const weeks: Date[][] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  }

  return (
    <table className="month-grid" id="calendar-month">
      <caption className="sr-only">{`Registrations in ${formatMonthYear(date)}`}</caption>
      <thead>
        <tr>
          {WEEKDAYS_SHORT.map((w, i) => (
            <th scope="col" key={w}>
              <abbr title={WEEKDAYS_LONG[i]}>{w}</abbr>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={toDayKey(week[0])}>
            {week.map((day) => {
              const events = byDay.get(toDayKey(day)) ?? [];
              const inMonth = day.getMonth() === date.getMonth();
              const isToday = isSameDay(day, today);
              const more = events.length - MAX_CHIPS;
              const count = events.length === 1 ? '1 registration' : `${events.length} registrations`;
              return (
                <td
                  key={toDayKey(day)}
                  className={`month-cell${inMonth ? '' : ' month-cell--outside'}${isToday ? ' month-cell--today' : ''}`}
                  aria-current={isToday ? 'date' : undefined}
                >
                  <button
                    type="button"
                    className="month-cell__day"
                    onClick={() => onSelectDay(day)}
                    aria-label={`${formatLongDate(day)}${isToday ? ', today' : ''}, ${count}. Open day view`}
                  >
                    {day.getDate()}
                  </button>
                  {events.length > 0 && (
                    <>
                      <span className="month-cell__count" aria-hidden="true">{events.length}</span>
                      <ul className="month-cell__events">
                        {events.slice(0, MAX_CHIPS).map((r) => (
                          <li key={r.id}>
                            <EventChip registration={r} onOpen={onOpen} />
                          </li>
                        ))}
                      </ul>
                      {more > 0 && (
                        <button
                          type="button"
                          className="month-cell__more"
                          onClick={() => onSelectDay(day)}
                          aria-label={`${more} more on ${formatLongDate(day)}. Open day view`}
                        >
                          +{more} more
                        </button>
                      )}
                    </>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
