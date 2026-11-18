// The user menu in the top bar: who is logged in plus LOG OUT,
// or LOG IN / REGISTER when nobody is.
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import Pill from './Pill.jsx';

export default function UserMenu() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="usermenu" />; // don't flash LOG IN while checking

  if (!user) {
    return (
      <div className="usermenu">
        <Pill to="/login" color="sky" size="sm">
          Log in
        </Pill>
        <Pill to="/register" color="amber" size="sm">
          Register
        </Pill>
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="usermenu">
      <div className="usermenu__who">
        <span className="usermenu__label">Logged in as</span>
        <span className="usermenu__name">{user.username}</span>
      </div>
      <Pill color="red" size="sm" onClick={handleLogout}>
        Log out
      </Pill>
    </div>
  );
}
