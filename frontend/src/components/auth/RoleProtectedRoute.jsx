import { Navigate } from 'react-router-dom';
import { getUser, rolesMatch, getDashboardPath } from '../../utils/auth';

/**
 * Restricts routes to users with an allowed role.
 * @param {React.ReactNode} children
 * @param {string[]} allowedRoles
 */
const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const user = getUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!rolesMatch(user.role, allowedRoles)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return children;
};

export default RoleProtectedRoute;
