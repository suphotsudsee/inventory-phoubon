/**
 * Role-Based Access Control (RBAC) for Inventory Phoubon
 * Permission definitions for each role
 */

const ROLE_PERMISSIONS = {
  admin: [
    'dashboard:read',
    'products:read',
    'products:write',
    'products:delete',
    'stock:read',
    'stock:write',
    'stock:adjust',
    'purchase-orders:read',
    'purchase-orders:write',
    'purchase-orders:approve',
    'purchase-orders:delete',
    'suppliers:read',
    'suppliers:write',
    'suppliers:delete',
    'reports:read',
    'users:read',
    'users:write',
    'users:delete'
  ],
  manager: [
    'dashboard:read',
    'products:read',
    'products:write',
    'stock:read',
    'stock:write',
    'stock:adjust',
    'purchase-orders:read',
    'purchase-orders:write',
    'purchase-orders:approve',
    'suppliers:read',
    'suppliers:write',
    'reports:read',
    'users:read'
  ],
  staff: [
    'dashboard:read',
    'products:read',
    'stock:read',
    'stock:write',
    'purchase-orders:read',
    'reports:read'
  ],
  viewer: [
    'dashboard:read',
    'products:read',
    'stock:read',
    'purchase-orders:read',
    'reports:read'
  ]
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {string[]}
 */
function getPermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if role is valid
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
function isValidRole(role) {
  return Object.keys(ROLE_PERMISSIONS).includes(role);
}

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
  getPermissions,
  isValidRole
};