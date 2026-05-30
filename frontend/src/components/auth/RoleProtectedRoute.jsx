import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getUser, rolesMatch, getDashboardPath, syncSessionFromServer } from '../../utils/auth';
import { getCurrentUser } from '../../services/api';
import PageLoader from '../common/PageLoader/PageLoader';

/**
 * Restricts routes to users with an allowed role.
 * Syncs the session from the server first so stale localStorage cannot bypass checks.
 */
const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const [checking, setChecking] = useState(true);
  const [user, setUserState] = useState(() => getUser());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const session = await syncSessionFromServer(getCurrentUser);
      if (cancelled) return;
      setUserState(session.ok ? session.user : null);
      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    return <PageLoader message="Checking your account..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!rolesMatch(user.role, allowedRoles)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return children;
};

export default RoleProtectedRoute;
