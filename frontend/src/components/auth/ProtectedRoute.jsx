import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUser, isTokenExpired, clearAuth } from '../../utils/auth';

/**
 * ProtectedRoute - Wraps routes that require authentication
 * Redirects to login if user is not authenticated or token is expired
 */
const ProtectedRoute = ({ children }) => {
  const authenticated = isAuthenticated();
  const user = getUser();
  const tokenExpired = isTokenExpired();

  // If token is expired, clear auth and redirect to login
  if (tokenExpired) {
    clearAuth();
    return <Navigate to="/login" replace />;
  }

  // If not authenticated, redirect to login
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated but no user data, clear auth and redirect
  if (!user) {
    clearAuth();
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the protected component
  return children;
};

export default ProtectedRoute;
