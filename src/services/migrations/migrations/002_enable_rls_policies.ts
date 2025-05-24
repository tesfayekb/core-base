
import { Migration } from '../migrationRunner';

const migration: Migration = {
  version: '002',
  name: 'enable_rls_policies',
  script: `
-- Enable RLS on all tenant-aware tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Tenants policies (users can only see their accessible tenants)
CREATE POLICY IF NOT EXISTS "tenant_isolation_policy" ON tenants
    FOR ALL
    USING (
        id IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)::UUID
        )
    );

-- Users policies (tenant isolation)
CREATE POLICY IF NOT EXISTS "user_tenant_isolation_policy" ON users
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Roles policies (tenant isolation)
CREATE POLICY IF NOT EXISTS "role_tenant_isolation_policy" ON roles
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Permissions policies (tenant isolation)
CREATE POLICY IF NOT EXISTS "permission_tenant_isolation_policy" ON permissions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- User roles policies (tenant isolation)
CREATE POLICY IF NOT EXISTS "user_role_tenant_isolation_policy" ON user_roles
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- User permissions policies (tenant isolation)
CREATE POLICY IF NOT EXISTS "user_permission_tenant_isolation_policy" ON user_permissions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Role permissions policies (tenant isolation)
CREATE POLICY IF NOT EXISTS "role_permission_tenant_isolation_policy" ON role_permissions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- User tenants policies (user can see their own tenant associations)
CREATE POLICY IF NOT EXISTS "user_tenant_access_policy" ON user_tenants
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true)::UUID);

-- Audit logs policies (tenant isolation with some exceptions for SuperAdmin)
CREATE POLICY IF NOT EXISTS "audit_tenant_isolation_policy" ON audit_logs
    FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::UUID OR 
        tenant_id IS NULL -- System-wide events
    );

-- User sessions policies (user can only see their own sessions in current tenant)
CREATE POLICY IF NOT EXISTS "session_user_tenant_policy" ON user_sessions
    FOR ALL
    USING (
        user_id = current_setting('app.current_user_id', true)::UUID AND 
        tenant_id = current_setting('app.current_tenant_id', true)::UUID
    );
  `
};

export default migration;
