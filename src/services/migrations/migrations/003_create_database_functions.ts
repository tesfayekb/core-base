
import { Migration } from '../migrationRunner';

const migration: Migration = {
  version: '003',
  name: 'create_database_functions',
  script: `
-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_action VARCHAR,
    p_resource VARCHAR,
    p_resource_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
    current_tenant UUID;
BEGIN
    -- Get current tenant context
    current_tenant := current_tenant_id();
    
    IF current_tenant IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check direct user permissions
    SELECT EXISTS(
        SELECT 1 
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = p_user_id
            AND up.tenant_id = current_tenant
            AND p.action::text = p_action
            AND p.resource = p_resource
            AND (p_resource_id IS NULL OR up.resource_id = p_resource_id)
            AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
    ) INTO has_permission;
    
    -- If no direct permission, check role-based permissions
    IF NOT has_permission THEN
        SELECT EXISTS(
            SELECT 1
            FROM user_roles ur
            JOIN role_permissions rp ON ur.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = p_user_id
                AND ur.tenant_id = current_tenant
                AND p.action::text = p_action
                AND p.resource = p_resource
                AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
        ) INTO has_permission;
    END IF;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's effective permissions
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(
    permission_name VARCHAR,
    resource VARCHAR,
    action VARCHAR,
    resource_id UUID,
    source VARCHAR
) AS $$
BEGIN
    -- Return direct permissions
    RETURN QUERY
    SELECT 
        p.name,
        p.resource,
        p.action::VARCHAR,
        up.resource_id,
        'direct'::VARCHAR as source
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id
        AND up.tenant_id = current_tenant_id()
        AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP);
    
    -- Return role-based permissions
    RETURN QUERY
    SELECT 
        p.name,
        p.resource,
        p.action::VARCHAR,
        NULL::UUID as resource_id,
        r.name::VARCHAR as source
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
        AND ur.tenant_id = current_tenant_id()
        AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate tenant access for user
CREATE OR REPLACE FUNCTION validate_tenant_access(
    p_user_id UUID,
    p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1
        FROM user_tenants ut
        WHERE ut.user_id = p_user_id
            AND ut.tenant_id = p_tenant_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to switch tenant context (with validation)
CREATE OR REPLACE FUNCTION switch_tenant_context(
    p_user_id UUID,
    p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN;
BEGIN
    -- Validate user has access to tenant
    SELECT validate_tenant_access(p_user_id, p_tenant_id) INTO has_access;
    
    IF has_access THEN
        PERFORM set_tenant_context(p_tenant_id);
        PERFORM set_user_context(p_user_id);
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_event_type audit_event_type,
    p_action VARCHAR,
    p_resource_type VARCHAR DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        event_type,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent
    ) VALUES (
        current_tenant_id(),
        current_user_id(),
        p_event_type,
        p_action,
        p_resource_type,
        p_resource_id,
        p_details,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration infrastructure functions
CREATE OR REPLACE FUNCTION create_migrations_table_if_not_exists()
RETURNS VOID AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version CHARACTER VARYING NOT NULL UNIQUE,
    name CHARACTER VARYING NOT NULL,
    script TEXT NOT NULL,
    hash CHARACTER VARYING NOT NULL,
    applied_by CHARACTER VARYING,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute migration scripts
CREATE OR REPLACE FUNCTION execute_migration(migration_script TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE migration_script;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger for automated timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  `
};

export default migration;
