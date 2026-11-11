import { Link, NavLink, Outlet } from 'react-router';
import { useAccount, useAuth } from '../../auth/AuthContext';
import { NotificationBell } from '../../components/NotificationBell';
import { TeaPopups } from '../../components/TeaPopups';
import { DemoMenu } from '../../components/DemoMenu';
import { CalendarIcon, ReportIcon, SignOutIcon, VisitorsIcon, WordingIcon } from '../../components/icons';
import { BrandLogo } from '../../components/BrandLogo';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export function PortalLayout() {
  const account = useAccount();
  const { logout } = useAuth();

  return (
    <div className="portal">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="portal-header">
        <div className="portal-header__inner">
          <Link to="/portal" className="portal-brand" id="portal-brand">
            <BrandLogo className="portal-brand__logo" />
            <span className="portal-brand__text">
              <span className="portal-brand__name">Visitor Registration</span>
              <span className="portal-brand__sub">Staff portal</span>
            </span>
          </Link>
          <nav className="portal-nav" aria-label="Portal">
            <NavLink end to="/portal" className="portal-nav__link" id="nav-calendar">
              <CalendarIcon />
              <span>Calendar</span>
            </NavLink>
            {account.role === 'superadmin' && (
              <>
                <NavLink to="/portal/visitors" className="portal-nav__link" id="nav-visitors">
                  <VisitorsIcon />
                  <span>Visitors</span>
                </NavLink>
                <NavLink to="/portal/form-wording" className="portal-nav__link" id="nav-form-wording">
                  <WordingIcon />
                  <span>Form wording</span>
                </NavLink>
                <NavLink to="/portal/tea-report" className="portal-nav__link" id="nav-tea-report">
                  <ReportIcon />
                  <span>Tea report</span>
                </NavLink>
              </>
            )}
          </nav>
          <div className="portal-header__actions">
            <NotificationBell />
            <div className="account" id="account-chip">
              <span className="account__avatar" aria-hidden="true">{initials(account.displayName)}</span>
              <span className="account__name">
                <span className="sr-only">Signed in as </span>
                {account.displayName}
              </span>
            </div>
            <button type="button" className="btn btn-ghost btn-small" onClick={logout} id="sign-out">
              <SignOutIcon />
              <span className="btn-label">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" className="portal-main" tabIndex={-1}>
        <Outlet />
      </main>
      <TeaPopups />
      <DemoMenu />
    </div>
  );
}
