
// RBAC Types for Direct Permission Assignment Model
// Phase 1.4: RBAC Foundation Implementation

export interface Permission {
  id: string;
  tenant_id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
  permissions: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  tenant_id: string;
  user_id: string;
  role_id: string;
  assigned_by?: string;
  assigned_at: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export interface UserPermission {
  id: string;
  tenant_id: string;
  user_id: string;
  permission_id: string;
  resource_id?: string;
  granted_by?: string;
  granted_at: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export interface RolePermission {
  id: string;
  tenant_id: string;
  role_id: string;
  permission_id: string;
  assigned_by?: string;
  assigned_at: string;
  metadata?: Record<string, any>;
}

// Permission checking types
export interface PermissionCheck {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  tenantId?: string;
}

export interface EffectivePermission {
  permission_name: string;
  resource: string;
  action: string;
  resource_id?: string;
  source: string; // 'direct' or role name
}

// Permission constants following documentation
export const PERMISSION_ACTIONS = [
  'Create',
  'Read', 
  'Update',
  'Delete',
  'ViewAny',
  'UpdateAny',
  'DeleteAny',
  'Manage'
] as const;

export const RESOURCES = [
  'users',
  'roles',
  'permissions',
  'tenants',
  'audit_logs'
] as const;

export type PermissionAction = typeof PERMISSION_ACTIONS[number];
export type ResourceType = typeof RESOURCES[number];
