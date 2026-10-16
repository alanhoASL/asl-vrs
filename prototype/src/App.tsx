import { Link, Route, Routes } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { PortalLayout } from './pages/portal/PortalLayout';
import { CalendarPage } from './pages/portal/CalendarPage';
import { AuditLogPage } from './pages/portal/AuditLogPage';
import { TeaReportPage } from './pages/portal/TeaReportPage';
import { RegistrationForm } from './pages/register/RegistrationForm';
import { TeaOrderPage } from './pages/tea/TeaOrderPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/portal"
        element={(
          <RequireAuth>
            <PortalLayout />
          </RequireAuth>
        )}
      >
        <Route index element={<CalendarPage />} />
        <Route
          path="audit"
          element={(
            <RequireAuth role="superadmin">
              <AuditLogPage />
            </RequireAuth>
          )}
        />
        <Route
          path="tea-report"
          element={(
            <RequireAuth role="superadmin">
              <TeaReportPage />
            </RequireAuth>
          )}
        />
      </Route>
      <Route path="/register/guest" element={<RegistrationForm key="guest-prereg" variant="guest-prereg" />} />
      <Route path="/register/guest-adhoc" element={<RegistrationForm key="guest-adhoc" variant="guest-adhoc" />} />
      <Route path="/register/vendor" element={<RegistrationForm key="vendor" variant="vendor" />} />
      <Route path="/tea/:roomId" element={<TeaOrderPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NotFound() {
  return (
    <main id="main-content" className="simple-page">
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to the prototype home page</Link>
      </p>
    </main>
  );
}
