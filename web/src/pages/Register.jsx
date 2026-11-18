import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import ScreenHeader from '../components/ScreenHeader.jsx';
import Pill from '../components/Pill.jsx';
import Bar from '../components/Bar.jsx';
import { Alert } from '../components/Feedback.jsx';

const PANEL_BAR = [
  { color: 'amber', grow: 1 },
  { color: 'peach', width: 50 },
  { color: 'sky', width: 24, cap: true },
];

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/notes" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await register(username, password);
      navigate('/notes', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <ScreenHeader code="ND-91 // New operator" title="Register" />
      <Bar segments={PANEL_BAR} />
      <form className="auth__panel" onSubmit={handleSubmit}>
        <Alert title="Registration failed">{error}</Alert>
        <label className="field">
          <span className="field__label">
            Username <span className="field__count">3-32 chars: a-z 0-9 . _ -</span>
          </span>
          <input
            className="field__input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z0-9_.\-]+"
            autoFocus
            required
          />
        </label>
        <label className="field">
          <span className="field__label">
            Password <span className="field__count">8+ chars</span>
          </span>
          <input
            className="field__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
        </label>
        <label className="field">
          <span className="field__label">Confirm password</span>
          <input
            className="field__input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <div className="form__actions">
          <Pill type="submit" color="amber" disabled={busy}>
            {busy ? 'Creating...' : 'Create account'}
          </Pill>
          <span className="auth__switch">
            Have an account? <Link to="/login">Log in</Link>
          </span>
        </div>
      </form>
      <Bar segments={PANEL_BAR} />
    </div>
  );
}
