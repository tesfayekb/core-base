
// RBAC Types for Direct Permission Assignment Model
// Version: 1.0.0
// Phase 1.4: RBAC Foundation

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'view' | 'edit';

export type ResourceType = 
  | 'users' 
  | 'roles' 
  | 'permissions' 
  | 'tenants' 
  | 'audit_logs'
  | 'reports'
  | 'settings';

export interface Permission {
  id: string;
  tenant_id: string;
  name: string;
  resource: ResourceType;
  action: PermissionAction;
  description?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
  metadata: Record<string, any>;
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
}

export interface RolePermission {
  id: string;
  tenant_id: string;
  role_id: string;
  permission_id: string;
  assigned_by?: string;
  assigned_at: string;
}

export interface PermissionCheck {
  userId: string;
  action: PermissionAction;
  resource: ResourceType;
  resourceId?: string;
  tenantId?: string;
}

export interface EffectivePermission {
  permission_name: string;
  resource: ResourceType;
  action: PermissionAction;
  resource_id?: string;
  source: string; // 'direct' or role name
}

// System roles constants
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'SuperAdmin',
  BASIC_USER: 'BasicUser',
  TENANT_ADMIN: 'TenantAdmin',
  USER_MANAGER: 'UserManager'
} as const;

// Permission helpers
export interface PermissionRequest {
  resource: ResourceType;
  action: PermissionAction;
  resourceId?: string;
}

export interface RoleAssignmentRequest {
  userId: string;
  roleId: string;
  tenantId?: string;
  assignedBy: string;
  expiresAt?: string;
}
