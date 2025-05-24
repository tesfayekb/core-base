
import { Migration } from '../migrationRunner';

const migration: Migration = {
  version: '006',
  name: 'create_utility_functions',
  script: `
-- Utility Functions for Enterprise System
-- Version: 1.0.0
-- Phase 1.2: Database Foundation - Utility Functions

-- Function to check user permissions with caching
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_tenant_id UUID,
    p_resource VARCHAR,
    p_action permission_action
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
BEGIN
    -- Check direct user permissions
    SELECT EXISTS(
        SELECT 1 FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = p_user_id
        AND up.tenant_id = p_tenant_id
        AND p.resource = p_resource
        AND p.action = p_action
        AND (up.expires_at IS NULL OR up.expires_at > NOW())
    ) INTO has_permission;
    
    -- If no direct permission, check role-based permissions
    IF NOT has_permission THEN
        SELECT EXISTS(
            SELECT 1 FROM user_roles ur
            JOIN role_permissions rp ON ur.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = p_user_id
            AND ur.tenant_id = p_tenant_id
            AND p.resource = p_resource
            AND p.action = p_action
            AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        ) INTO has_permission;
    END IF;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get all user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID, p_tenant_id UUID)
RETURNS TABLE(permission_name VARCHAR, resource VARCHAR, action permission_action) AS $$
BEGIN
    -- Return direct permissions
    RETURN QUERY
    SELECT p.name, p.resource, p.action
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id
    AND up.tenant_id = p_tenant_id
    AND (up.expires_at IS NULL OR up.expires_at > NOW())
    
    UNION
    
    -- Return role-based permissions
    SELECT p.name, p.resource, p.action
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
    AND ur.tenant_id = p_tenant_id
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to validate tenant access
CREATE OR REPLACE FUNCTION validate_tenant_access(p_user_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM user_tenants
        WHERE user_id = p_user_id
        AND tenant_id = p_tenant_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to switch tenant context with validation
CREATE OR REPLACE FUNCTION switch_tenant_context(p_user_id UUID, p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Validate user has access to tenant
    IF NOT validate_tenant_access(p_user_id, p_tenant_id) THEN
        RAISE EXCEPTION 'User does not have access to tenant';
    END IF;
    
    -- Set tenant context
    PERFORM set_tenant_context(p_tenant_id);
    PERFORM set_user_context(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_tenant_id UUID,
    p_event_type audit_event_type,
    p_action VARCHAR,
    p_resource_type VARCHAR DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id, tenant_id, event_type, action,
        resource_type, resource_id, details,
        ip_address, user_agent
    ) VALUES (
        p_user_id, p_tenant_id, p_event_type, p_action,
        p_resource_type, p_resource_id, p_details,
        p_ip_address, p_user_agent
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `
};

export default migration;
