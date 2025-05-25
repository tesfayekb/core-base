
import { Migration } from '../migrationRunner';

const migration: Migration = {
  version: '003',
  name: 'create_rbac_functions',
  script: `
-- RBAC Database Functions for Direct Permission Assignment Model
-- Version: 1.0.0
-- Phase 1.4: RBAC Foundation

-- Function to check user permission with direct assignment model
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_action TEXT,
  p_resource TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN := FALSE;
  effective_tenant_id UUID;
BEGIN
  -- Get effective tenant ID
  IF p_tenant_id IS NOT NULL THEN
    effective_tenant_id := p_tenant_id;
  ELSE
    SELECT tenant_id INTO effective_tenant_id 
    FROM users 
    WHERE id = p_user_id;
  END IF;
  
  -- Return false if no tenant context
  IF effective_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has permission through directly assigned roles
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
    AND ur.tenant_id = effective_tenant_id
    AND p.tenant_id = effective_tenant_id
    AND p.action = p_action
    AND p.resource = p_resource
    AND (p_resource_id IS NULL OR p.resource_id IS NULL OR p.resource_id = p_resource_id)
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  ) INTO has_permission;
  
  -- Also check direct user permissions
  IF NOT has_permission THEN
    SELECT EXISTS (
      SELECT 1 
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = p_user_id
      AND up.tenant_id = effective_tenant_id
      AND p.tenant_id = effective_tenant_id
      AND p.action = p_action
      AND p.resource = p_resource
      AND (p_resource_id IS NULL OR up.resource_id IS NULL OR up.resource_id = p_resource_id)
      AND (up.expires_at IS NULL OR up.expires_at > NOW())
    ) INTO has_permission;
  END IF;
  
  RETURN COALESCE(has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's effective permissions
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE(
  permission_name TEXT,
  resource TEXT,
  action TEXT,
  resource_id UUID,
  source TEXT
) AS $$
BEGIN
  -- Return permissions from roles (direct assignment)
  RETURN QUERY
  SELECT DISTINCT
    p.name AS permission_name,
    p.resource,
    p.action::TEXT,
    NULL::UUID AS resource_id,
    r.name AS source
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  JOIN role_permissions rp ON r.id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id
  AND ur.tenant_id = p_tenant_id
  AND p.tenant_id = p_tenant_id
  AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  
  UNION
  
  -- Return direct user permissions
  SELECT DISTINCT
    p.name AS permission_name,
    p.resource,
    p.action::TEXT,
    up.resource_id,
    'direct' AS source
  FROM user_permissions up
  JOIN permissions p ON up.permission_id = p.id
  WHERE up.user_id = p_user_id
  AND up.tenant_id = p_tenant_id
  AND p.tenant_id = p_tenant_id
  AND (up.expires_at IS NULL OR up.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign default role to new users
CREATE OR REPLACE FUNCTION assign_default_user_role()
RETURNS TRIGGER AS $$
DECLARE
  basic_user_role_id UUID;
BEGIN
  -- Get BasicUser role ID for the tenant
  SELECT id INTO basic_user_role_id
  FROM roles
  WHERE name = 'BasicUser'
  AND tenant_id = NEW.tenant_id
  AND is_system_role = TRUE;
  
  -- Assign BasicUser role if it exists
  IF basic_user_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id, tenant_id)
    VALUES (NEW.id, basic_user_role_id, NEW.tenant_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic role assignment
CREATE TRIGGER trigger_assign_default_user_role
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_user_role();

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_user_permission TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions TO authenticated;
  `
};

export default migration;
