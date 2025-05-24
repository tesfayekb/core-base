
import { Migration } from '../migrationRunner';

const migration: Migration = {
  version: '005',
  name: 'enable_rls_policies',
  script: `
-- Row-Level Security Policies for Tenant Isolation
-- Version: 1.0.0
-- Phase 1.2: Database Foundation - Security Policies

-- Tenant context functions
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_tenant_id', true)::UUID,
        NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_user_id', true)::UUID,
        NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION set_user_context(user_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tenant-aware tables
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

-- Tenant isolation policies
CREATE POLICY tenant_isolation_policy ON tenants
    FOR ALL
    USING (
        id IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY user_tenant_isolation_policy ON users
    FOR ALL
    USING (tenant_id = current_tenant_id());

CREATE POLICY user_profile_tenant_isolation_policy ON user_profiles
    FOR ALL
    USING (
        user_id IN (
            SELECT id FROM users WHERE tenant_id = current_tenant_id()
        )
    );

CREATE POLICY password_history_tenant_isolation_policy ON password_history
    FOR ALL
    USING (
        user_id IN (
            SELECT id FROM users WHERE tenant_id = current_tenant_id()
        )
    );

CREATE POLICY role_tenant_isolation_policy ON roles
    FOR ALL
    USING (tenant_id = current_tenant_id());

CREATE POLICY permission_tenant_isolation_policy ON permissions
    FOR ALL
    USING (tenant_id = current_tenant_id());

CREATE POLICY user_role_tenant_isolation_policy ON user_roles
    FOR ALL
    USING (tenant_id = current_tenant_id());

CREATE POLICY user_permission_tenant_isolation_policy ON user_permissions
    FOR ALL
    USING (tenant_id = current_tenant_id());

CREATE POLICY role_permission_tenant_isolation_policy ON role_permissions
    FOR ALL
    USING (tenant_id = current_tenant_id());

CREATE POLICY user_tenant_access_policy ON user_tenants
    FOR ALL
    USING (user_id = current_user_id());

CREATE POLICY audit_tenant_isolation_policy ON audit_logs
    FOR ALL
    USING (
        tenant_id = current_tenant_id() OR 
        tenant_id IS NULL
    );

CREATE POLICY session_user_tenant_policy ON user_sessions
    FOR ALL
    USING (
        user_id = current_user_id() AND 
        tenant_id = current_tenant_id()
    );
  `
};

export default migration;
