import { useEffect, useRef, useState } from 'react';
import { setDemoSettings, useDemoSettings } from '../data/demoSettings';
import { simulateRegistration, simulateTeaOrder } from '../data/simulate';
import { TEA_SERVICE_HOURS } from '../data/catalog';
import { minutesToTime } from '../lib/date';

/** Prototype-only floating menu for live demos: fakes incoming tea orders and registrations. */
export function DemoMenu() {
  const settings = useDemoSettings();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => cancelClose, []);

  const run = (action: () => string) => setStatus(`Sent: ${action()}`);
  const teaHours = `${minutesToTime(TEA_SERVICE_HOURS.start)} - ${minutesToTime(TEA_SERVICE_HOURS.end)}`;

  return (
    <div
      className="demo-menu"
      ref={wrapRef}
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={() => {
        cancelClose();
        closeTimer.current = window.setTimeout(() => setOpen(false), 250);
      }}
    >
      {open && (
        <div className="demo-menu__panel" id="demo-menu-panel" role="group" aria-labelledby="demo-menu-title">
          <p className="demo-menu__title" id="demo-menu-title">Simulate an incoming event</p>
          <div className="demo-menu__section">
            <p className="demo-menu__label">Tea service</p>
            <button type="button" className="demo-menu__item" onClick={() => run(simulateTeaOrder)} id="demo-tea-order">
              <span className="demo-menu__dot demo-menu__dot--tea" aria-hidden="true" />
              New tea order
              <span className="demo-menu__hint">Shows the popup</span>
            </button>
          </div>
          <div className="demo-menu__section">
            <p className="demo-menu__label">Registrations</p>
            <button type="button" className="demo-menu__item" onClick={() => run(() => simulateRegistration('guest-prereg'))} id="demo-reg-prereg">
              <span className="demo-menu__dot demo-menu__dot--prereg" aria-hidden="true" />
              Guest pre-registration
            </button>
            <button type="button" className="demo-menu__item" onClick={() => run(() => simulateRegistration('guest-adhoc'))} id="demo-reg-adhoc">
              <span className="demo-menu__dot demo-menu__dot--adhoc" aria-hidden="true" />
              Guest ad hoc
            </button>
            <button type="button" className="demo-menu__item" onClick={() => run(() => simulateRegistration('vendor'))} id="demo-reg-vendor">
              <span className="demo-menu__dot demo-menu__dot--vendor" aria-hidden="true" />
              Vendor / contractor
            </button>
          </div>
          <div className="demo-menu__section demo-menu__section--setting">
            <label className="demo-menu__switch" htmlFor="demo-tea-hours">
              <input
                type="checkbox"
                role="switch"
                id="demo-tea-hours"
                checked={settings.enforceTeaHours}
                onChange={(e) => setDemoSettings({ enforceTeaHours: e.target.checked })}
                aria-describedby="demo-tea-hours-hint"
              />
              <span>Apply tea service hours ({teaHours})</span>
            </label>
            <p className="demo-menu__hint-text" id="demo-tea-hours-hint">
              {settings.enforceTeaHours
                ? 'The tea page closes outside these hours.'
                : 'Off: the tea page accepts orders at any time.'}
            </p>
          </div>
          <p className="demo-menu__status" role="status" aria-live="polite">{status}</p>
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        className="demo-menu__trigger"
        aria-expanded={open}
        aria-controls="demo-menu-panel"
        onClick={() => setOpen((o) => !o)}
        id="demo-menu-trigger"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">
          <path d="M8 5.5v13l10-6.5-10-6.5z" />
        </svg>
        Demo tools
      </button>
    </div>
  );
}
