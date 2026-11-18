import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import ScreenHeader from '../components/ScreenHeader.jsx';
import Pill from '../components/Pill.jsx';
import Bar from '../components/Bar.jsx';
import { Alert } from '../components/Feedback.jsx';

const PANEL_BAR = [
  { color: 'sky', grow: 1 },
  { color: 'lilac', width: 50 },
  { color: 'amber', width: 24, cap: true },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Already logged in? Go straight to the notes.
  if (user) return <Navigate to="/notes" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      navigate(location.state?.from || '/notes', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <ScreenHeader code="ND-90 // Access control" title="Log in" />
      <Bar segments={PANEL_BAR} />
      <form className="auth__panel" onSubmit={handleSubmit}>
        <Alert title="Access denied">{error}</Alert>
        <label className="field">
          <span className="field__label">Username</span>
          <input
            className="field__input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            required
          />
        </label>
        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="field__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <div className="form__actions">
          <Pill type="submit" color="sky" disabled={busy}>
            {busy ? 'Verifying...' : 'Log in'}
          </Pill>
          <span className="auth__switch">
            No account? <Link to="/register">Register</Link>
          </span>
        </div>
      </form>
      <Bar segments={PANEL_BAR} />
    </div>
  );
}
