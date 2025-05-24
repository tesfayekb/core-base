
// Database Types for Multi-Tenant Enterprise System
// Version: 1.0.0
// Phase 1.1: Database Foundation

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';
export type AuditEventType = 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system_event' | 'security_event';
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'view' | 'edit';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  settings: Record<string, any>;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  status: UserStatus;
  email_verified_at?: string;
  last_login_at?: string;
  failed_login_attempts: number;
  locked_until?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
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

export interface Permission {
  id: string;
  tenant_id: string;
  name: string;
  resource: string;
  action: PermissionAction;
  description?: string;
  metadata: Record<string, any>;
  created_at: string;
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

export interface UserTenant {
  id: string;
  user_id: string;
  tenant_id: string;
  is_primary: boolean;
  joined_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id?: string;
  user_id?: string;
  event_type: AuditEventType;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details: Record<string, any>;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  session_id?: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  tenant_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  last_accessed_at: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
}

// Permission checking types
export interface PermissionCheck {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
}

export interface EffectivePermission {
  permission_name: string;
  resource: string;
  action: string;
  resource_id?: string;
  source: string; // 'direct' or role name
}

// Standard result pattern for database operations
export interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
