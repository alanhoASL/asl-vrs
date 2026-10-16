import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { TextField } from '../components/TextField';
import { ACCOUNTS } from '../data/catalog';

export function LoginPage() {
  const { account, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Staff sign in - ASL Visitor Registration';
  }, []);

  if (account) return <Navigate to="/portal" replace />;

  const from = (location.state as { from?: string } | null)?.from ?? '/portal';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      document.getElementById(username.trim() ? 'password' : 'username')?.focus();
      return;
    }
    if (login(username, password)) {
      navigate(from, { replace: true });
    } else {
      setError('The username or password is incorrect.');
      setPassword('');
      document.getElementById('password')?.focus();
    }
  };

  return (
    <div className="login-page">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <main id="main-content" className="login-main" tabIndex={-1}>
        <section className="login-card" aria-labelledby="login-title">
          <span className="brand">ASL</span>
          <h1 id="login-title" className="login-card__title">Staff sign in</h1>
          <p className="login-card__subtitle">Visitor Registration System</p>

          <form noValidate onSubmit={handleSubmit} id="login-form" aria-labelledby="login-title">
            {error && (
              <div className="alert alert--error" role="alert" id="login-error">
                {error}
              </div>
            )}
            <TextField
              id="username"
              label="Username"
              required
              value={username}
              onChange={(v) => { setUsername(v); setError(''); }}
              autoComplete="username"
              autoCapitalize="none"
            />
            <TextField
              id="password"
              label="Password"
              type="password"
              required
              value={password}
              onChange={(v) => { setPassword(v); setError(''); }}
              autoComplete="current-password"
            />
            <button type="submit" className="btn btn-primary btn-block btn-submit" id="sign-in">Sign in</button>
          </form>

          <aside className="demo-box" aria-labelledby="demo-box-title">
            <h2 id="demo-box-title" className="demo-box__title">Prototype accounts</h2>
            <ul className="demo-box__list">
              {ACCOUNTS.map((a) => (
                <li key={a.id}>
                  <span>
                    <strong>{a.displayName}</strong>
                    <span className="demo-box__cred">{a.username} / {a.password}</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-soft btn-small"
                    id={`fill-${a.username}`}
                    onClick={() => { setUsername(a.username); setPassword(a.password); setError(''); }}
                    aria-label={`Fill in the ${a.displayName} account`}
                  >
                    Use
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </section>
        <p className="login-back"><Link to="/">Back to prototype home</Link></p>
      </main>
    </div>
  );
}
