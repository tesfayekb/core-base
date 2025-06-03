
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { supabase } from '@/services/database/connection';

describe('User Journey Integration Tests', () => {
  let testUserId: string;
  let testTenantId: string;

  beforeEach(async () => {
    // Setup test data
    const { data: tenant } = await supabase
      .from('tenants')
      .insert({ name: 'Test Tenant', slug: 'test-tenant' })
      .select()
      .single();
    
    testTenantId = tenant.id;

    const { data: user } = await supabase
      .from('users')
      .insert({
        email: 'test@example.com',
        tenant_id: testTenantId,
        password_hash: 'test_hash'
      })
      .select()
      .single();
    
    testUserId = user.id;
  });

  afterEach(async () => {
    // Cleanup test data
    await supabase.from('users').delete().eq('id', testUserId);
    await supabase.from('tenants').delete().eq('id', testTenantId);
  });

  it('should create user with tenant association', async () => {
    const { data: user } = await supabase
      .from('users')
      .select('*, user_tenants(*)')
      .eq('id', testUserId)
      .single();

    expect(user).toBeTruthy();
    expect(user.tenant_id).toBe(testTenantId);
  });

  it('should handle user permissions correctly', async () => {
    // Test permission system integration
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', testUserId);

    expect(Array.isArray(permissions)).toBe(true);
  });
});
