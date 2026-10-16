import { overallState, registrationAccessibleName } from '../../data/status';
import type { Registration } from '../../data/types';
import { formatTime } from '../../lib/date';

interface Props {
  registration: Registration;
  onOpen: (id: string) => void;
  showTime?: boolean;
}

export function EventChip({ registration: r, onOpen, showTime = true }: Props) {
  const state = overallState(r);
  const name = registrationAccessibleName(r);
  return (
    <button
      type="button"
      className={`event-chip type-${r.type} state-${state}`}
      onClick={() => onOpen(r.id)}
      aria-label={`${name}. Open details`}
      title={name}
    >
      {showTime && <span className="event-chip__time">{formatTime(new Date(r.visitAt))}</span>}
      <span className="event-chip__title">{r.company}</span>
      {r.visitors.length > 1 && <span className="event-chip__count" aria-hidden="true">{r.visitors.length}</span>}
    </button>
  );
}
