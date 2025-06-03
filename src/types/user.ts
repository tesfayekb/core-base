
// User types that match the actual database schema
export interface UserWithRoles {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  email_verified_at?: string;
  last_login_at?: string;
  failed_login_attempts?: number;
  locked_until?: string;
  metadata?: Record<string, any>;
  user_roles?: UserRole[];
}

export interface UserRole {
  id: string;
  role_id: string;
  assigned_at: string;
  role: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface CreateUserRequest {
  email: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  tenant_id: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  status?: string;
  metadata?: Record<string, any>;
}
