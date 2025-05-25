
-- Permission Check Functions for RBAC System
-- Phase 1.4: RBAC Foundation - Database Functions

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_action TEXT,
  p_resource TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission BOOLEAN;
  v_effective_tenant_id UUID;
BEGIN
  -- Get effective tenant ID (use provided or current session)
  v_effective_tenant_id := COALESCE(p_tenant_id, current_setting('app.current_tenant_id', true)::UUID);
  
  -- Check for permission through user roles
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
    AND ur.tenant_id = v_effective_tenant_id
    AND p.resource = p_resource
    AND p.action = p_action
    AND (p_resource_id IS NULL OR ur.resource_id = p_resource_id)
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID,
  p_tenant_id UUID DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  name TEXT,
  resource TEXT,
  action TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_effective_tenant_id UUID;
BEGIN
  -- Get effective tenant ID
  v_effective_tenant_id := COALESCE(p_tenant_id, current_setting('app.current_tenant_id', true)::UUID);
  
  -- Return all permissions for user through their roles
  RETURN QUERY
    SELECT DISTINCT 
      p.id,
      p.tenant_id,
      p.name,
      p.resource,
      p.action,
      p.description,
      p.metadata,
      p.created_at
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
    AND ur.tenant_id = v_effective_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is SuperAdmin
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND r.name = 'SuperAdmin'
    AND r.is_system_role = true
  ) INTO v_is_super_admin;
  
  RETURN v_is_super_admin;
END;
$$;

-- Function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
