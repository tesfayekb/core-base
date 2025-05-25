
// Test Seed Data for RBAC System
// This provides comprehensive test data for all RBAC testing scenarios

export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roles: string[];
}

export interface TestTenant {
  id: string;
  name: string;
  ownerId: string;
}

export interface TestRole {
  id: string;
  name: string;
  tenantId: string;
  description: string;
  permissions: string[];
}

export interface TestPermission {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
}

export const testTenants: TestTenant[] = [
  {
    id: 'tenant-corp-a',
    name: 'Corporation A',
    ownerId: 'user-ceo-corp-a'
  },
  {
    id: 'tenant-corp-b',
    name: 'Corporation B',
    ownerId: 'user-ceo-corp-b'
  },
  {
    id: 'tenant-startup',
    name: 'Startup Inc',
    ownerId: 'user-founder-startup'
  }
];

export const testRoles: TestRole[] = [
  {
    id: 'role-superadmin',
    name: 'SuperAdmin',
    tenantId: '',
    description: 'System-wide administrative access',
    permissions: ['*:*']
  },
  {
    id: 'role-tenant-admin',
    name: 'TenantAdmin',
    tenantId: 'tenant-corp-a',
    description: 'Full administrative access within tenant',
    permissions: ['Manage:users', 'Manage:documents', 'Manage:settings', 'Manage:roles']
  },
  {
    id: 'role-manager',
    name: 'Manager',
    tenantId: 'tenant-corp-a',
    description: 'Management permissions for team resources',
    permissions: ['Read:users', 'Update:users', 'Manage:documents', 'Read:settings']
  },
  {
    id: 'role-editor',
    name: 'Editor',
    tenantId: 'tenant-corp-a',
    description: 'Content editing permissions',
    permissions: ['Read:documents', 'Create:documents', 'Update:documents', 'Read:users']
  },
  {
    id: 'role-viewer',
    name: 'Viewer',
    tenantId: 'tenant-corp-a',
    description: 'Read-only access to resources',
    permissions: ['Read:documents', 'Read:users']
  },
  {
    id: 'role-external-auditor',
    name: 'ExternalAuditor',
    tenantId: 'tenant-corp-a',
    description: 'Audit log access for compliance',
    permissions: ['Read:audit', 'Read:users']
  }
];

export const testUsers: TestUser[] = [
  {
    id: 'user-superadmin',
    email: 'superadmin@system.com',
    firstName: 'Super',
    lastName: 'Admin',
    tenantId: '',
    roles: ['role-superadmin']
  },
  {
    id: 'user-ceo-corp-a',
    email: 'ceo@corp-a.com',
    firstName: 'Alice',
    lastName: 'CEO',
    tenantId: 'tenant-corp-a',
    roles: ['role-tenant-admin']
  },
  {
    id: 'user-manager-corp-a',
    email: 'manager@corp-a.com',
    firstName: 'Bob',
    lastName: 'Manager',
    tenantId: 'tenant-corp-a',
    roles: ['role-manager']
  },
  {
    id: 'user-editor-corp-a',
    email: 'editor@corp-a.com',
    firstName: 'Carol',
    lastName: 'Editor',
    tenantId: 'tenant-corp-a',
    roles: ['role-editor']
  },
  {
    id: 'user-viewer-corp-a',
    email: 'viewer@corp-a.com',
    firstName: 'David',
    lastName: 'Viewer',
    tenantId: 'tenant-corp-a',
    roles: ['role-viewer']
  },
  {
    id: 'user-auditor-corp-a',
    email: 'auditor@external.com',
    firstName: 'Eve',
    lastName: 'Auditor',
    tenantId: 'tenant-corp-a',
    roles: ['role-external-auditor']
  },
  {
    id: 'user-ceo-corp-b',
    email: 'ceo@corp-b.com',
    firstName: 'Frank',
    lastName: 'CEO',
    tenantId: 'tenant-corp-b',
    roles: ['role-tenant-admin']
  }
];

export const testPermissions: TestPermission[] = [
  // Document permissions
  { id: 'perm-read-docs', action: 'Read', resource: 'documents' },
  { id: 'perm-create-docs', action: 'Create', resource: 'documents' },
  { id: 'perm-update-docs', action: 'Update', resource: 'documents' },
  { id: 'perm-delete-docs', action: 'Delete', resource: 'documents' },
  { id: 'perm-manage-docs', action: 'Manage', resource: 'documents' },

  // User permissions
  { id: 'perm-read-users', action: 'Read', resource: 'users' },
  { id: 'perm-create-users', action: 'Create', resource: 'users' },
  { id: 'perm-update-users', action: 'Update', resource: 'users' },
  { id: 'perm-delete-users', action: 'Delete', resource: 'users' },
  { id: 'perm-manage-users', action: 'Manage', resource: 'users' },

  // Role permissions
  { id: 'perm-read-roles', action: 'Read', resource: 'roles' },
  { id: 'perm-create-roles', action: 'Create', resource: 'roles' },
  { id: 'perm-update-roles', action: 'Update', resource: 'roles' },
  { id: 'perm-delete-roles', action: 'Delete', resource: 'roles' },
  { id: 'perm-manage-roles', action: 'Manage', resource: 'roles' },

  // Settings permissions
  { id: 'perm-read-settings', action: 'Read', resource: 'settings' },
  { id: 'perm-update-settings', action: 'Update', resource: 'settings' },
  { id: 'perm-manage-settings', action: 'Manage', resource: 'settings' },

  // Audit permissions
  { id: 'perm-read-audit', action: 'Read', resource: 'audit' },
  { id: 'perm-manage-audit', action: 'Manage', resource: 'audit' },

  // Dashboard permissions
  { id: 'perm-read-dashboard', action: 'Read', resource: 'dashboard' },

  // System permissions
  { id: 'perm-system-admin', action: 'SuperAdmin', resource: '*' },
  { id: 'perm-cross-tenant', action: 'cross_entity_management', resource: '*' }
];

// Test scenarios for comprehensive testing
export const testScenarios = {
  // Permission dependency testing
  permissionDependencies: [
    {
      name: 'Update implies Read',
      user: 'user-editor-corp-a',
      permission: { action: 'Read', resource: 'documents' },
      expectedResult: true,
      reason: 'User has Update permission which implies Read'
    },
    {
      name: 'Manage implies all operations',
      user: 'user-manager-corp-a',
      permission: { action: 'Delete', resource: 'documents' },
      expectedResult: true,
      reason: 'User has Manage permission which implies Delete'
    }
  ],

  // Entity boundary testing
  entityBoundaries: [
    {
      name: 'Cross-tenant access denied',
      user: 'user-manager-corp-a',
      tenant: 'tenant-corp-b',
      permission: { action: 'Read', resource: 'documents' },
      expectedResult: false,
      reason: 'User cannot access resources from different tenant'
    },
    {
      name: 'SuperAdmin cross-tenant access',
      user: 'user-superadmin',
      tenant: 'tenant-corp-a',
      permission: { action: 'Manage', resource: 'users' },
      expectedResult: true,
      reason: 'SuperAdmin can access all tenants'
    }
  ],

  // Role assignment testing
  roleAssignment: [
    {
      name: 'Admin can assign roles',
      assigner: 'user-ceo-corp-a',
      assignee: 'user-viewer-corp-a',
      role: 'role-editor',
      expectedResult: true,
      reason: 'TenantAdmin can assign roles within tenant'
    },
    {
      name: 'User cannot assign roles',
      assigner: 'user-viewer-corp-a',
      assignee: 'user-editor-corp-a',
      role: 'role-manager',
      expectedResult: false,
      reason: 'Viewer does not have role assignment permissions'
    }
  ]
};

// Helper functions for test data
export const getTestUser = (userId: string): TestUser | undefined => {
  return testUsers.find(user => user.id === userId);
};

export const getTestTenant = (tenantId: string): TestTenant | undefined => {
  return testTenants.find(tenant => tenant.id === tenantId);
};

export const getTestRole = (roleId: string): TestRole | undefined => {
  return testRoles.find(role => role.id === roleId);
};

export const getUserPermissions = (userId: string): string[] => {
  const user = getTestUser(userId);
  if (!user) return [];

  const userRoles = user.roles.map(roleId => getTestRole(roleId)).filter(Boolean) as TestRole[];
  const permissions = userRoles.flatMap(role => role.permissions);
  
  return [...new Set(permissions)]; // Remove duplicates
};

export const hasTestPermission = (userId: string, action: string, resource: string): boolean => {
  const permissions = getUserPermissions(userId);
  
  // Check for exact permission
  if (permissions.includes(`${action}:${resource}`)) return true;
  
  // Check for wildcard permissions
  if (permissions.includes('*:*')) return true;
  if (permissions.includes(`*:${resource}`)) return true;
  if (permissions.includes(`${action}:*`)) return true;
  
  // Check for manage permission
  if (action !== 'Manage' && permissions.includes(`Manage:${resource}`)) return true;
  
  return false;
};
