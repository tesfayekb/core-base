
import { Migration } from '../migrationRunner';

const migration: Migration = {
  version: '006',
  name: 'create_utility_functions',
  script: `
-- Database Utility Functions for Enterprise System
-- Version: 1.0.0
-- Phase 1.2: Database Foundation - Utility Functions

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

-- Function to check if user is SuperAdmin
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
            AND r.name = 'SuperAdmin'
            AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's primary tenant
CREATE OR REPLACE FUNCTION get_user_primary_tenant(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    primary_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO primary_tenant_id
    FROM user_tenants
    WHERE user_id = p_user_id AND is_primary = TRUE
    LIMIT 1;
    
    IF primary_tenant_id IS NULL THEN
        SELECT tenant_id INTO primary_tenant_id
        FROM user_tenants
        WHERE user_id = p_user_id
        ORDER BY joined_at ASC
        LIMIT 1;
    END IF;
    
    RETURN primary_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `
};

export default migration;
