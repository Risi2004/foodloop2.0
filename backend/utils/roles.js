const VENDOR_ROLES = ['restaurant', 'supermarket', 'business', 'individual'];

function canonicalRole(role) {
  if (!role) return '';
  const r = String(role).trim();
  if (r.toLowerCase() === 'receiver') return 'Receiver';
  if (r.toLowerCase() === 'driver') return 'Driver';
  if (r.toLowerCase() === 'donor') return 'Donor';
  if (r.toLowerCase() === 'admin') return 'Admin';
  return r;
}

function rolesMatch(userRole, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const normalized = canonicalRole(userRole);
  return allowedRoles.some((allowed) => {
    const a = String(allowed).trim();
    if (a.toLowerCase() === normalized.toLowerCase()) return true;
    if (VENDOR_ROLES.includes(a.toLowerCase()) && VENDOR_ROLES.includes(normalized.toLowerCase())) {
      return a.toLowerCase() === normalized.toLowerCase();
    }
    return false;
  });
}

const APPROVAL_ROLES = ['receiver', 'driver', 'restaurant', 'supermarket', 'business', 'individual'];

function requiresApproval(role, customerIncomeLevel) {
  const r = (role || '').toLowerCase();
  if (r === 'customer') {
    return (customerIncomeLevel || '').toLowerCase() === 'low';
  }
  return APPROVAL_ROLES.includes(r);
}

function statusAfterVerification(role, customerIncomeLevel) {
  return requiresApproval(role, customerIncomeLevel) ? 'pending_approval' : 'active';
}

module.exports = {
  VENDOR_ROLES,
  canonicalRole,
  rolesMatch,
  requiresApproval,
  statusAfterVerification,
};
