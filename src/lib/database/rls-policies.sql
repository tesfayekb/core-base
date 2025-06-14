
-- Row-Level Security Policies for Tenant Isolation
-- Version: 1.0.0
-- Phase 1.2: Database Foundation - Security Policies

-- =============================================================================
-- TENANT CONTEXT FUNCTIONS
-- =============================================================================

-- Function to get current tenant context
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_tenant_id', true)::UUID,
        NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user context
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_user_id', true)::UUID,
        NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to set user context
CREATE OR REPLACE FUNCTION set_user_context(user_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ENABLE RLS ON ALL TENANT-AWARE TABLES
-- =============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- TENANT ISOLATION POLICIES
-- =============================================================================

-- Tenants policies (users can only see their accessible tenants)
CREATE POLICY tenant_isolation_policy ON tenants
    FOR ALL
    USING (
        id IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_user_id()
        )
    );

-- Users policies (tenant isolation)
CREATE POLICY user_tenant_isolation_policy ON users
    FOR ALL
    USING (tenant_id = current_tenant_id());

-- User profiles policies (tenant isolation via user)
CREATE POLICY user_profile_tenant_isolation_policy ON user_profiles
    FOR ALL
    USING (
        user_id IN (
            SELECT id FROM users WHERE tenant_id = current_tenant_id()
        )
    );

-- Password history policies (tenant isolation via user)
CREATE POLICY password_history_tenant_isolation_policy ON password_history
    FOR ALL
    USING (
        user_id IN (
            SELECT id FROM users WHERE tenant_id = current_tenant_id()
        )
    );

-- =============================================================================
-- RBAC ISOLATION POLICIES
-- =============================================================================

-- Roles policies (tenant isolation)
CREATE POLICY role_tenant_isolation_policy ON roles
    FOR ALL
    USING (tenant_id = current_tenant_id());

-- Permissions policies (tenant isolation)
CREATE POLICY permission_tenant_isolation_policy ON permissions
    FOR ALL
    USING (tenant_id = current_tenant_id());

-- User roles policies (tenant isolation)
CREATE POLICY user_role_tenant_isolation_policy ON user_roles
    FOR ALL
    USING (tenant_id = current_tenant_id());

-- User permissions policies (tenant isolation)
CREATE POLICY user_permission_tenant_isolation_policy ON user_permissions
    FOR ALL
    USING (tenant_id = current_tenant_id());

-- Role permissions policies (tenant isolation)
CREATE POLICY role_permission_tenant_isolation_policy ON role_permissions
    FOR ALL
    USING (tenant_id = current_tenant_id());

-- =============================================================================
-- MULTI-TENANT ASSOCIATION POLICIES
-- =============================================================================

-- User tenants policies (user can see their own tenant associations)
CREATE POLICY user_tenant_access_policy ON user_tenants
    FOR ALL
    USING (user_id = current_user_id());

-- =============================================================================
-- AUDIT AND SESSION POLICIES
-- =============================================================================

-- Audit logs policies (tenant isolation with exceptions for system events)
CREATE POLICY audit_tenant_isolation_policy ON audit_logs
    FOR ALL
    USING (
        tenant_id = current_tenant_id() OR 
        tenant_id IS NULL -- System-wide events
    );

-- User sessions policies (user can only see their own sessions in current tenant)
CREATE POLICY session_user_tenant_policy ON user_sessions
    FOR ALL
    USING (
        user_id = current_user_id() AND 
        tenant_id = current_tenant_id()
    );
