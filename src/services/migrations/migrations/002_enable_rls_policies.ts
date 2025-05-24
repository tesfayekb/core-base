
import { Migration } from '../migrationRunner';

const migration: Migration = {
  version: '002',
  name: 'enable_rls_policies',
  script: `
-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for tenants
CREATE POLICY IF NOT EXISTS "tenant_isolation" ON tenants
  FOR ALL USING (id = get_current_tenant_id());

-- Create RLS policies for roles
CREATE POLICY IF NOT EXISTS "role_tenant_isolation" ON roles
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- Create RLS policies for user_roles
CREATE POLICY IF NOT EXISTS "user_role_tenant_isolation" ON user_roles
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- Create RLS policies for audit_logs
CREATE POLICY IF NOT EXISTS "audit_log_tenant_isolation" ON audit_logs
  FOR ALL USING (tenant_id = get_current_tenant_id());
  `
};

export default migration;
