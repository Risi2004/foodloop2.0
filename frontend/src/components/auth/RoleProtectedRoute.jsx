/**
 * Offline / demo: no auth or role gating. Same props as before so App.jsx route definitions stay unchanged.
 * @param {React.ReactNode} children
 * @param {string[]} allowedRoles — unused in offline mode
 */
const RoleProtectedRoute = ({ children }) => {
  return children;
};

export default RoleProtectedRoute;
