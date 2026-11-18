// Guards the pages that need a logged-in user. While the session is being
// checked it shows a loader; if nobody is logged in it redirects to /login,
// remembering where the user was going.
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { Loading } from './Feedback.jsx';

export default function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading label="Verifying session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
