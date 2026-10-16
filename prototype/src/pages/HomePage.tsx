import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ACCOUNTS, ROOMS, TEA_SERVICE_HOURS } from '../data/catalog';
import { resetDemoData } from '../data/store';
import { minutesToTime } from '../lib/date';

const FORMS = [
  { to: '/register/guest', theme: 'prereg', eyebrow: 'Guest', title: 'Pre-registration', text: 'QR sent to the guest before the visit.' },
  { to: '/register/guest-adhoc', theme: 'adhoc', eyebrow: 'Guest', title: 'Ad hoc registration', text: 'QR on show at reception for walk-in guests.' },
  { to: '/register/vendor', theme: 'vendor', eyebrow: 'Vendor / Contractor', title: 'On site registration', text: 'QR on show at reception for vendors.' },
];

export function HomePage() {
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    document.title = 'Prototype home - ASL Visitor Registration';
  }, []);

  return (
    <div className="hub">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <main id="main-content" className="hub__main" tabIndex={-1}>
        <header className="hub__header">
          <span className="brand">ASL</span>
          <h1 className="hub__title">Visitor Registration System</h1>
          <p className="hub__lead">
            Clickable prototype with dummy data. Data is kept in this browser only. Open a form or tea page in a second
            tab while signed in to the staff portal to see notifications arrive.
          </p>
        </header>

        <section className="hub__section" aria-labelledby="hub-portal-title">
          <h2 id="hub-portal-title" className="hub__section-title">Staff portal</h2>
          <div className="hub-card hub-card--portal">
            <div>
              <p className="hub-card__text">Calendar of registrations, visit details, confirm, dismiss and label preview.</p>
              <table className="demo-accounts" aria-label="Demo accounts">
                <thead>
                  <tr>
                    <th scope="col">Account</th>
                    <th scope="col">Username</th>
                    <th scope="col">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {ACCOUNTS.map((a) => (
                    <tr key={a.id}>
                      <td>{a.displayName}</td>
                      <td><code>{a.username}</code></td>
                      <td><code>{a.password}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link to="/login" className="btn btn-primary" id="hub-sign-in">Go to staff sign in</Link>
          </div>
        </section>

        <section className="hub__section" aria-labelledby="hub-forms-title">
          <h2 id="hub-forms-title" className="hub__section-title">Public registration forms</h2>
          <ul className="hub-grid">
            {FORMS.map((f) => (
              <li key={f.to}>
                <Link to={f.to} className={`hub-card hub-card--link theme-${f.theme}`} id={`hub-form-${f.theme}`}>
                  <span className="eyebrow">
                    <span className="eyebrow__dot" aria-hidden="true" />
                    {f.eyebrow}
                  </span>
                  <span className="hub-card__title">{f.title}</span>
                  <span className="hub-card__text">{f.text}</span>
                  <span className="hub-card__url">{f.to}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="hub__section" aria-labelledby="hub-tea-title">
          <h2 id="hub-tea-title" className="hub__section-title">Tea order pages (one QR per room)</h2>
          <ul className="hub-grid hub-grid--rooms">
            {ROOMS.map((r) => (
              <li key={r.id}>
                <Link to={`/tea/${r.id}`} className="hub-card hub-card--link theme-tea" id={`hub-tea-${r.id}`}>
                  <span className="hub-card__title">{r.name}</span>
                  <span className="hub-card__url">/tea/{r.id}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="hub__note">
            Tea service hours ({minutesToTime(TEA_SERVICE_HOURS.start)} to {minutesToTime(TEA_SERVICE_HOURS.end)}) are off by
            default for demos; switch them on in the portal&apos;s Demo tools menu.{' '}
            <Link to={`/tea/${ROOMS[0].id}?time=17:00`} id="hub-tea-closed-preview">Preview the closed page</Link>
            {' '}(adds <code>?time=17:00</code> to the address).
          </p>
        </section>

        <section className="hub__section" aria-labelledby="hub-reset-title">
          <h2 id="hub-reset-title" className="hub__section-title">Demo data</h2>
          <div className="hub-card hub-card--portal">
            <p className="hub-card__text">
              Rebuild the dummy registrations, tea orders, notifications and audit log around today&apos;s date. Anything
              submitted in this browser is removed.
            </p>
            <button
              type="button"
              className="btn btn-outline"
              id="reset-demo-data"
              onClick={() => {
                resetDemoData();
                setResetDone(true);
              }}
            >
              Reset demo data
            </button>
          </div>
          <p className="hub__status" role="status" aria-live="polite">
            {resetDone ? 'Demo data has been reset.' : ''}
          </p>
        </section>
      </main>
    </div>
  );
}
