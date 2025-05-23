
# Multi-tenant Testing Strategy

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document defines a comprehensive testing strategy for multi-tenant scenarios, ensuring that data isolation, permission boundaries, and tenant-specific customizations function correctly across the system.

## Testing Principles

Multi-tenant testing follows these core principles:

1. **Complete Tenant Isolation**: Verify that tenants cannot access or modify each other's data
2. **Tenant Context Preservation**: Ensure tenant context is maintained throughout all operations
3. **Cross-Tenant Boundary Testing**: Test boundary conditions and edge cases for tenant isolation
4. **Performance Under Multi-Tenant Load**: Verify system performance with multiple active tenants

## Test Categories

### 1. Data Isolation Tests

#### Database-Level Isolation

```typescript
describe('Database-Level Tenant Isolation', () => {
  let tenant1Id, tenant2Id, user1Id, user2Id, resource1Id;
  
  beforeAll(async () => {
    // Set up test tenants and users
    tenant1Id = await createTestTenant('Tenant 1');
    tenant2Id = await createTestTenant('Tenant 2');
    user1Id = await createTestUser({ tenantId: tenant1Id });
    user2Id = await createTestUser({ tenantId: tenant2Id });
    
    // Create test resource in tenant 1
    resource1Id = await createTestResource({ 
      tenantId: tenant1Id,
      name: 'Test Resource',
      ownerId: user1Id
    });
  });
  
  test('Tenant 1 user can access own tenant resources', async () => {
    // Set tenant context to tenant 1
    await setTenantContext(tenant1Id);
    
    // Attempt to access resource as tenant 1 user
    const resource = await getResourceById(resource1Id);
    
    // Expect resource to be accessible
    expect(resource).not.toBeNull();
    expect(resource.id).toBe(resource1Id);
  });
  
  test('Tenant 2 user cannot access Tenant 1 resources', async () => {
    // Set tenant context to tenant 2
    await setTenantContext(tenant2Id);
    
    // Attempt to access resource as tenant 2 user
    const resource = await getResourceById(resource1Id);
    
    // Expect resource to be inaccessible
    expect(resource).toBeNull();
  });
  
  test('Direct database query respects tenant isolation', async () => {
    // Set tenant context to tenant 2
    await setTenantContext(tenant2Id);
    
    // Attempt direct database query
    const result = await db.query(
      'SELECT * FROM resources WHERE id = $1',
      [resource1Id]
    );
    
    // Expect no results due to RLS policies
    expect(result.rows).toHaveLength(0);
  });
});
```

#### API-Level Isolation

```typescript
describe('API-Level Tenant Isolation', () => {
  let tenant1Token, tenant2Token, resource1Id;
  
  beforeAll(async () => {
    // Create test tenants and authentication tokens
    const tenant1 = await createTestTenant('API Tenant 1');
    const tenant2 = await createTestTenant('API Tenant 2');
    
    tenant1Token = await generateAuthToken({ tenantId: tenant1.id });
    tenant2Token = await generateAuthToken({ tenantId: tenant2.id });
    
    // Create test resource in tenant 1
    const createResponse = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${tenant1Token}`)
      .send({ name: 'API Test Resource' });
      
    resource1Id = createResponse.body.id;
  });
  
  test('Tenant 1 can access own resources via API', async () => {
    const response = await request(app)
      .get(`/api/resources/${resource1Id}`)
      .set('Authorization', `Bearer ${tenant1Token}`);
      
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(resource1Id);
  });
  
  test('Tenant 2 cannot access Tenant 1 resources via API', async () => {
    const response = await request(app)
      .get(`/api/resources/${resource1Id}`)
      .set('Authorization', `Bearer ${tenant2Token}`);
      
    expect(response.status).toBe(404);
  });
  
  test('Tenant 2 cannot modify Tenant 1 resources via API', async () => {
    const response = await request(app)
      .put(`/api/resources/${resource1Id}`)
      .set('Authorization', `Bearer ${tenant2Token}`)
      .send({ name: 'Modified By Tenant 2' });
      
    expect(response.status).toBe(404);
  });
});
```

### 2. Permission Boundary Tests

Test how permissions and roles function across tenant boundaries:

```typescript
describe('Multi-tenant Permission Boundaries', () => {
  let globalAdmin, tenant1Admin, tenant1User, tenant2Admin;
  let tenant1Id, tenant2Id, tenant1Resource;
  
  beforeAll(async () => {
    // Set up test environment
    globalAdmin = await createGlobalAdmin();
    
    tenant1Id = await createTestTenant('Tenant 1');
    tenant2Id = await createTestTenant('Tenant 2');
    
    tenant1Admin = await createTenantAdmin(tenant1Id);
    tenant1User = await createTenantUser(tenant1Id);
    tenant2Admin = await createTenantAdmin(tenant2Id);
    
    // Create test resource in tenant 1
    tenant1Resource = await createTestResource({
      tenantId: tenant1Id,
      name: 'Permission Test Resource'
    });
  });
  
  test('Tenant admin can manage own tenant resources', async () => {
    await setUserAndTenant(tenant1Admin.id, tenant1Id);
    
    const canView = await checkPermission(
      tenant1Admin.id, 
      'view', 
      'resources',
      tenant1Resource.id
    );
    
    const canUpdate = await checkPermission(
      tenant1Admin.id, 
      'update', 
      'resources',
      tenant1Resource.id
    );
    
    expect(canView).toBe(true);
    expect(canUpdate).toBe(true);
  });
  
  test('Tenant admin cannot manage other tenant resources', async () => {
    await setUserAndTenant(tenant2Admin.id, tenant2Id);
    
    const canView = await checkPermission(
      tenant2Admin.id, 
      'view', 
      'resources',
      tenant1Resource.id
    );
    
    const canUpdate = await checkPermission(
      tenant2Admin.id, 
      'update', 
      'resources',
      tenant1Resource.id
    );
    
    expect(canView).toBe(false);
    expect(canUpdate).toBe(false);
  });
  
  test('Global admin can manage all tenant resources', async () => {
    await setUserAndTenant(globalAdmin.id, tenant1Id);
    
    const canView = await checkPermission(
      globalAdmin.id, 
      'view', 
      'resources',
      tenant1Resource.id
    );
    
    const canUpdate = await checkPermission(
      globalAdmin.id, 
      'update', 
      'resources',
      tenant1Resource.id
    );
    
    expect(canView).toBe(true);
    expect(canUpdate).toBe(true);
    
    // Change tenant context
    await setUserAndTenant(globalAdmin.id, tenant2Id);
    
    // Global admin should still have access when in tenant 2 context
    const canStillView = await checkPermission(
      globalAdmin.id, 
      'view', 
      'resources',
      tenant1Resource.id
    );
    
    expect(canStillView).toBe(true);
  });
});
```

### 3. Tenant Context Switching Tests

Test proper handling of tenant context switching:

```typescript
describe('Tenant Context Switching', () => {
  let multiTenantUser, tenant1Id, tenant2Id;
  let tenant1Resource, tenant2Resource;
  
  beforeAll(async () => {
    // Create tenants
    tenant1Id = await createTestTenant('Switch Tenant 1');
    tenant2Id = await createTestTenant('Switch Tenant 2');
    
    // Create user with access to both tenants
    multiTenantUser = await createMultiTenantUser([tenant1Id, tenant2Id]);
    
    // Create tenant-specific resources
    tenant1Resource = await createTestResource({
      tenantId: tenant1Id,
      name: 'Tenant 1 Resource'
    });
    
    tenant2Resource = await createTestResource({
      tenantId: tenant2Id,
      name: 'Tenant 2 Resource'
    });
  });
  
  test('User sees appropriate resources when switching tenants', async () => {
    // Set tenant context to tenant 1
    await setUserAndTenant(multiTenantUser.id, tenant1Id);
    
    // Get resources visible in tenant 1 context
    const tenant1Resources = await getUserVisibleResources(multiTenantUser.id);
    
    expect(tenant1Resources).toContainEqual(
      expect.objectContaining({ id: tenant1Resource.id })
    );
    expect(tenant1Resources).not.toContainEqual(
      expect.objectContaining({ id: tenant2Resource.id })
    );
    
    // Switch tenant context to tenant 2
    await setUserAndTenant(multiTenantUser.id, tenant2Id);
    
    // Get resources visible in tenant 2 context
    const tenant2Resources = await getUserVisibleResources(multiTenantUser.id);
    
    expect(tenant2Resources).toContainEqual(
      expect.objectContaining({ id: tenant2Resource.id })
    );
    expect(tenant2Resources).not.toContainEqual(
      expect.objectContaining({ id: tenant1Resource.id })
    );
  });
  
  test('Cache is properly invalidated on tenant switch', async () => {
    // Set tenant context to tenant 1
    await setUserAndTenant(multiTenantUser.id, tenant1Id);
    
    // Prime the cache
    await getUserPermissions(multiTenantUser.id);
    
    // Verify cache contains tenant 1 context
    const tenant1Cache = getPermissionCacheForUser(multiTenantUser.id);
    expect(tenant1Cache.tenantId).toBe(tenant1Id);
    
    // Switch tenant context to tenant 2
    await setUserAndTenant(multiTenantUser.id, tenant2Id);
    
    // Verify cache was invalidated and repopulated with tenant 2 context
    const tenant2Cache = getPermissionCacheForUser(multiTenantUser.id);
    expect(tenant2Cache.tenantId).toBe(tenant2Id);
  });
});
```

### 4. Tenant Configuration Tests

Test tenant-specific configuration and settings:

```typescript
describe('Tenant-Specific Configuration', () => {
  let tenant1Id, tenant2Id;
  
  beforeAll(async () => {
    // Create test tenants
    tenant1Id = await createTestTenant('Config Tenant 1');
    tenant2Id = await createTestTenant('Config Tenant 2');
    
    // Set tenant-specific configurations
    await setTenantConfig(tenant1Id, 'theme', 'light');
    await setTenantConfig(tenant1Id, 'features', ['analytics', 'reports']);
    
    await setTenantConfig(tenant2Id, 'theme', 'dark');
    await setTenantConfig(tenant2Id, 'features', ['dashboard', 'calendar']);
  });
  
  test('Tenant-specific configuration is correctly retrieved', async () => {
    // Set context to tenant 1
    await setTenantContext(tenant1Id);
    
    // Get config for tenant 1
    const tenant1Theme = await getTenantConfig('theme');
    const tenant1Features = await getTenantConfig('features');
    
    expect(tenant1Theme).toBe('light');
    expect(tenant1Features).toEqual(['analytics', 'reports']);
    
    // Switch to tenant 2
    await setTenantContext(tenant2Id);
    
    // Get config for tenant 2
    const tenant2Theme = await getTenantConfig('theme');
    const tenant2Features = await getTenantConfig('features');
    
    expect(tenant2Theme).toBe('dark');
    expect(tenant2Features).toEqual(['dashboard', 'calendar']);
  });
  
  test('Default configuration applies when tenant-specific not set', async () => {
    // Set context to tenant 1
    await setTenantContext(tenant1Id);
    
    // Get config that isn't explicitly set for tenant 1
    const notSetConfig = await getTenantConfig('notifications');
    
    // Should fall back to system defaults
    expect(notSetConfig).toBe(true); // Assuming true is the default
  });
});
```

### 5. Cross-Tenant Operation Tests

Test operations that legitimately span multiple tenants:

```typescript
describe('Cross-Tenant Operations', () => {
  let superAdminId, tenant1Id, tenant2Id;
  
  beforeAll(async () => {
    // Create test environment
    superAdminId = await createSuperAdmin();
    tenant1Id = await createTestTenant('Cross Op Tenant 1');
    tenant2Id = await createTestTenant('Cross Op Tenant 2');
  });
  
  test('Super admin can perform tenant management operations', async () => {
    // Login as super admin
    await loginAsSuperAdmin(superAdminId);
    
    // List all tenants
    const tenants = await listAllTenants();
    
    // Verify super admin can see all tenants
    expect(tenants.map(t => t.id)).toContain(tenant1Id);
    expect(tenants.map(t => t.id)).toContain(tenant2Id);
    
    // Update tenant configuration
    const updateResult = await updateTenantConfiguration(tenant1Id, {
      maxUsers: 50
    });
    
    expect(updateResult.success).toBe(true);
  });
  
  test('Tenant metrics collection spans all tenants', async () => {
    // Set up test data in both tenants
    await setTenantContext(tenant1Id);
    await createTestActivity('login', { userId: 'user1' });
    
    await setTenantContext(tenant2Id);
    await createTestActivity('login', { userId: 'user2' });
    
    // Run system-wide metrics collection (should span all tenants)
    const metrics = await collectSystemMetrics('login_activity');
    
    // Verify metrics include data from all tenants
    expect(metrics.totalCount).toBeGreaterThanOrEqual(2);
    expect(metrics.byTenant[tenant1Id]).toBeDefined();
    expect(metrics.byTenant[tenant2Id]).toBeDefined();
  });
});
```

### 6. Performance Tests

Test system performance under multi-tenant load:

```typescript
describe('Multi-tenant Performance Tests', () => {
  // These tests may be skipped in regular test runs due to duration
  const NUM_TENANTS = 10;
  const OPERATIONS_PER_TENANT = 100;
  let tenantIds = [];
  
  beforeAll(async () => {
    // Create test tenants
    for (let i = 0; i < NUM_TENANTS; i++) {
      const tenantId = await createTestTenant(`Perf Tenant ${i+1}`);
      tenantIds.push(tenantId);
      
      // Create test data for each tenant
      await createTestDataForTenant(tenantId, OPERATIONS_PER_TENANT);
    }
  });
  
  test('Query performance remains consistent with multiple tenants', async () => {
    const results = [];
    
    // Test query performance for each tenant
    for (const tenantId of tenantIds) {
      await setTenantContext(tenantId);
      
      const startTime = performance.now();
      await getAllResources(); // Standard query that should use tenant isolation
      const endTime = performance.now();
      
      results.push({
        tenantId,
        duration: endTime - startTime
      });
    }
    
    // Calculate statistics
    const durations = results.map(r => r.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    
    // Assert performance expectations
    expect(avgDuration).toBeLessThan(100); // Less than 100ms average
    expect(maxDuration).toBeLessThan(200); // No single query over 200ms
  });
  
  test('Permission resolution scales with number of tenants', async () => {
    // Create user with access to all test tenants
    const userId = await createMultiTenantUser(tenantIds);
    
    // Measure permission resolution time across tenants
    const results = [];
    
    for (const tenantId of tenantIds) {
      await setUserAndTenant(userId, tenantId);
      
      const startTime = performance.now();
      await getUserPermissionsInContext(userId, tenantId);
      const endTime = performance.now();
      
      results.push({
        tenantId,
        duration: endTime - startTime
      });
    }
    
    // Calculate statistics
    const durations = results.map(r => r.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    
    // Assert performance expectations for permission resolution
    expect(avgDuration).toBeLessThan(50); // Less than 50ms average for permission resolution
  });
});
```

## Testing Infrastructure

### 1. Multi-tenant Test Environment Setup

```typescript
/**
 * Creates a complete test environment with multiple tenants,
 * users, and resources for comprehensive multi-tenant testing
 */
async function setupMultiTenantTestEnvironment(options = {}) {
  const {
    numTenants = 3,
    usersPerTenant = 2,
    resourcesPerTenant = 5,
    createSuperAdmin = true
  } = options;
  
  const env = {
    tenants: [],
    users: {},
    resources: {},
    superAdmin: null
  };
  
  // Create super admin if requested
  if (createSuperAdmin) {
    env.superAdmin = await createTestSuperAdmin();
  }
  
  // Create tenants
  for (let i = 0; i < numTenants; i++) {
    const tenantId = await createTestTenant(`Test Tenant ${i+1}`);
    env.tenants.push(tenantId);
    env.users[tenantId] = [];
    env.resources[tenantId] = [];
    
    // Create users for this tenant
    for (let j = 0; j < usersPerTenant; j++) {
      const isAdmin = j === 0; // First user is admin
      const user = await createTestUser({
        tenantId,
        isAdmin,
        email: `user_${i}_${j}@example.com`,
        name: `User ${j} of Tenant ${i+1}`
      });
      env.users[tenantId].push(user);
    }
    
    // Create resources for this tenant
    await setTenantContext(tenantId);
    for (let k = 0; k < resourcesPerTenant; k++) {
      const resource = await createTestResource({
        tenantId,
        name: `Resource ${k} of Tenant ${i+1}`,
        ownerId: env.users[tenantId][0].id
      });
      env.resources[tenantId].push(resource);
    }
  }
  
  return env;
}
```

### 2. Tenant Isolation Test Helpers

```typescript
/**
 * Tests that a user can only access resources from their assigned tenant
 */
async function testTenantIsolation(user, userTenantId, allTenants) {
  const results = {
    ownTenantAccess: false,
    crossTenantAccess: []
  };
  
  // Test access to own tenant
  await setUserAndTenant(user.id, userTenantId);
  const ownResources = await getUserVisibleResources(user.id);
  results.ownTenantAccess = ownResources.length > 0;
  
  // Test attempted access to other tenants
  for (const tenantId of allTenants) {
    if (tenantId === userTenantId) continue;
    
    await setUserAndTenant(user.id, tenantId);
    const otherResources = await getUserVisibleResources(user.id);
    
    results.crossTenantAccess.push({
      tenantId,
      hasAccess: otherResources.length > 0
    });
  }
  
  return results;
}
```

## Test Data Generation

### 1. Tenant Factory

```typescript
/**
 * Creates a test tenant with configurable properties
 */
async function createTestTenant(name, options = {}) {
  const {
    features = ['dashboard', 'reports', 'users'],
    theme = 'default',
    isActive = true,
    customDomain = null
  } = options;
  
  const tenant = {
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    features,
    theme,
    isActive,
    customDomain,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await db.query(
    'INSERT INTO tenants (name, slug, features, theme, is_active, custom_domain, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
    [tenant.name, tenant.slug, JSON.stringify(tenant.features), tenant.theme, tenant.isActive, tenant.customDomain, tenant.createdAt, tenant.updatedAt]
  );
  
  return result.rows[0].id;
}
```

### 2. User Factory

```typescript
/**
 * Creates a test user with configurable properties
 */
async function createTestUser(options = {}) {
  const {
    tenantId,
    email = `user_${Math.random().toString(36).substring(2)}@example.com`,
    name = 'Test User',
    isAdmin = false,
    isActive = true
  } = options;
  
  // Create auth user
  const password = 'Test@password123';
  const { user } = await auth.createUser({
    email,
    password,
    user_metadata: { name }
  });
  
  // Create user record
  await db.query(
    'INSERT INTO users (id, email, full_name, is_active) VALUES ($1, $2, $3, $4)',
    [user.id, email, name, isActive]
  );
  
  // Assign to tenant if specified
  if (tenantId) {
    const roleId = isAdmin 
      ? await getTenantAdminRoleId()
      : await getTenantUserRoleId();
      
    await db.query(
      'INSERT INTO user_tenants (user_id, tenant_id, role_id) VALUES ($1, $2, $3)',
      [user.id, tenantId, roleId]
    );
  }
  
  return {
    id: user.id,
    email,
    name,
    isAdmin,
    password // Include for testing login functionality
  };
}
```

## Test Coverage Requirements

Multi-tenant testing must achieve these coverage targets:

1. **Database Operations**: 100% coverage of tenant-filtered database operations
2. **Permission Checks**: 100% coverage of multi-tenant permission checks
3. **Tenant Switching**: 100% coverage of tenant context switching logic
4. **Edge Cases**: 100% coverage of boundary conditions and special cases

## Integration with CI/CD Pipeline

Multi-tenant tests should be integrated into the CI/CD pipeline:

1. **Automated Runs**: All multi-tenant tests run on every PR
2. **Separate Test Suite**: Multi-tenant tests run as a dedicated suite
3. **Performance Tracking**: Performance test results tracked over time
4. **Test Reports**: Dedicated reports for multi-tenant test coverage

## Related Documentation

- **[../TEST_FRAMEWORK.md](../TEST_FRAMEWORK.md)**: Main testing framework documentation
- **[../multitenancy/DATA_ISOLATION.md](../multitenancy/DATA_ISOLATION.md)**: Multi-tenant data isolation principles
- **[../multitenancy/DATABASE_QUERY_PATTERNS.md](../multitenancy/DATABASE_QUERY_PATTERNS.md)**: Multi-tenant database query patterns
- **[../rbac/ENTITY_BOUNDARIES.md](../rbac/ENTITY_BOUNDARIES.md)**: Entity boundary implementation
- **[../security/MULTI_TENANT_ROLES.md](../security/MULTI_TENANT_ROLES.md)**: Multi-tenant role management

## Version History

- **1.0.0**: Initial document creation (2025-05-22)
