
# Multi-tenant Integration Testing

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document outlines the specific integration testing approaches for multi-tenant scenarios, focusing on data isolation, tenant context management, and cross-tenant interactions.

## Core Multi-tenant Testing Concerns

### 1. Tenant Data Isolation

Test that data is properly isolated between tenants:

```typescript
// Example: Tenant data isolation test
describe('Tenant Data Isolation', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  let user1Id: string;
  let user2Id: string;
  
  beforeEach(async () => {
    // Create test tenants and users
    tenant1Id = await tenantService.createTenant('Test Tenant 1');
    tenant2Id = await tenantService.createTenant('Test Tenant 2');
    
    user1Id = await userService.createUser({
      email: 'user1@example.com',
      password: 'password123'
    });
    
    user2Id = await userService.createUser({
      email: 'user2@example.com',
      password: 'password123'
    });
    
    // Assign users to tenants
    await tenantService.addUserToTenant(user1Id, tenant1Id);
    await tenantService.addUserToTenant(user2Id, tenant2Id);
    
    // Create tenant-specific data
    await documentService.createDocument({
      title: 'Tenant 1 Document',
      content: 'Content for tenant 1',
      tenantId: tenant1Id,
      createdBy: user1Id
    });
    
    await documentService.createDocument({
      title: 'Tenant 2 Document',
      content: 'Content for tenant 2',
      tenantId: tenant2Id,
      createdBy: user2Id
    });
  });
  
  test('should only return documents from correct tenant', async () => {
    // Query as user 1 (in tenant 1)
    const user1Docs = await documentService.listDocuments({
      userId: user1Id,
      tenantId: tenant1Id
    });
    
    // Query as user 2 (in tenant 2)
    const user2Docs = await documentService.listDocuments({
      userId: user2Id,
      tenantId: tenant2Id
    });
    
    // Verify correct tenant isolation
    expect(user1Docs.length).toBe(1);
    expect(user1Docs[0].title).toBe('Tenant 1 Document');
    
    expect(user2Docs.length).toBe(1);
    expect(user2Docs[0].title).toBe('Tenant 2 Document');
  });
  
  test('should enforce row-level security with tenant context', async () => {
    // Direct database query with tenant context set
    await dbService.setTenantContext(tenant1Id);
    
    const result1 = await dbService.query(
      'SELECT * FROM documents'
    );
    
    expect(result1.length).toBe(1);
    expect(result1[0].title).toBe('Tenant 1 Document');
    
    // Switch tenant context
    await dbService.setTenantContext(tenant2Id);
    
    const result2 = await dbService.query(
      'SELECT * FROM documents'
    );
    
    expect(result2.length).toBe(1);
    expect(result2[0].title).toBe('Tenant 2 Document');
  });
  
  test('should prevent cross-tenant data access', async () => {
    // Try to access tenant 2's data as user 1
    const result = await documentService.listDocuments({
      userId: user1Id,
      tenantId: tenant2Id
    });
    
    // Should return empty array (not error) due to tenant isolation
    expect(result).toEqual([]);
  });
});
```

### 2. Tenant Context Switching

Test that tenant context is properly managed and switched:

```typescript
// Example: Tenant context switching test
describe('Tenant Context Switching', () => {
  let user: any;
  let tenant1: any;
  let tenant2: any;
  
  beforeEach(async () => {
    // Create multi-tenant user
    const { userId } = await userService.createUser({
      email: 'multi-tenant@example.com',
      password: 'password123'
    });
    user = { id: userId };
    
    // Create two tenants
    tenant1 = await tenantService.createTenant('Tenant 1');
    tenant2 = await tenantService.createTenant('Tenant 2');
    
    // Add user to both tenants
    await tenantService.addUserToTenant(user.id, tenant1.id);
    await tenantService.addUserToTenant(user.id, tenant2.id);
  });
  
  test('should switch context and maintain isolation', async () => {
    // Create data in tenant 1
    await tenantService.setCurrentTenant(user.id, tenant1.id);
    const doc1 = await documentService.createDocument({
      title: 'Tenant 1 Doc',
      content: 'Content 1',
      userId: user.id
    });
    
    // Switch to tenant 2
    await tenantService.setCurrentTenant(user.id, tenant2.id);
    const doc2 = await documentService.createDocument({
      title: 'Tenant 2 Doc',
      content: 'Content 2',
      userId: user.id
    });
    
    // Query in tenant 2 context
    const tenant2Docs = await documentService.listDocuments({
      userId: user.id
    });
    
    expect(tenant2Docs.length).toBe(1);
    expect(tenant2Docs[0].id).toBe(doc2.id);
    expect(tenant2Docs[0].title).toBe('Tenant 2 Doc');
    
    // Switch back to tenant 1
    await tenantService.setCurrentTenant(user.id, tenant1.id);
    const tenant1Docs = await documentService.listDocuments({
      userId: user.id
    });
    
    expect(tenant1Docs.length).toBe(1);
    expect(tenant1Docs[0].id).toBe(doc1.id);
    expect(tenant1Docs[0].title).toBe('Tenant 1 Doc');
  });
  
  test('should maintain tenant context across service boundaries', async () => {
    // Set tenant context
    await tenantService.setCurrentTenant(user.id, tenant1.id);
    
    // Create document through document service
    const doc = await documentService.createDocument({
      title: 'Cross-Service Test',
      content: 'Testing context across services',
      userId: user.id
    });
    
    // Verify tenant context was maintained in document
    expect(doc.tenant_id).toBe(tenant1.id);
    
    // Use a different service with same user
    const comment = await commentService.createComment({
      documentId: doc.id,
      content: 'Test comment',
      userId: user.id
    });
    
    // Verify tenant context was maintained across services
    expect(comment.tenant_id).toBe(tenant1.id);
  });
});
```

### 3. Cross-tenant User Management

Test handling of users that belong to multiple tenants:

```typescript
// Example: Cross-tenant user management test
describe('Multi-tenant User Management', () => {
  let adminUser: any;
  let regularUser: any;
  let tenant1: any;
  let tenant2: any;
  
  beforeEach(async () => {
    // Create test users
    adminUser = await userService.createUser({
      email: 'admin@example.com',
      password: 'password123',
      isSystemAdmin: true
    });
    
    regularUser = await userService.createUser({
      email: 'user@example.com',
      password: 'password123'
    });
    
    // Create tenants
    tenant1 = await tenantService.createTenant('Tenant 1');
    tenant2 = await tenantService.createTenant('Tenant 2');
  });
  
  test('should allow user to be added to multiple tenants', async () => {
    // Add regular user to both tenants
    await tenantService.addUserToTenant(regularUser.id, tenant1.id);
    await tenantService.addUserToTenant(regularUser.id, tenant2.id);
    
    // Get user's tenants
    const userTenants = await tenantService.getUserTenants(regularUser.id);
    
    expect(userTenants.length).toBe(2);
    expect(userTenants.map(t => t.id)).toContain(tenant1.id);
    expect(userTenants.map(t => t.id)).toContain(tenant2.id);
  });
  
  test('should handle different roles in different tenants', async () => {
    // Add regular user to both tenants with different roles
    await tenantService.addUserToTenant(regularUser.id, tenant1.id, 'admin');
    await tenantService.addUserToTenant(regularUser.id, tenant2.id, 'viewer');
    
    // Check roles in tenant 1
    await tenantService.setCurrentTenant(regularUser.id, tenant1.id);
    const isAdmin1 = await rbacService.userHasRole(regularUser.id, 'admin');
    const isViewer1 = await rbacService.userHasRole(regularUser.id, 'viewer');
    
    expect(isAdmin1).toBe(true);
    expect(isViewer1).toBe(false);
    
    // Check roles in tenant 2
    await tenantService.setCurrentTenant(regularUser.id, tenant2.id);
    const isAdmin2 = await rbacService.userHasRole(regularUser.id, 'admin');
    const isViewer2 = await rbacService.userHasRole(regularUser.id, 'viewer');
    
    expect(isAdmin2).toBe(false);
    expect(isViewer2).toBe(true);
  });
  
  test('should handle user removal from tenant', async () => {
    // Add user to both tenants
    await tenantService.addUserToTenant(regularUser.id, tenant1.id);
    await tenantService.addUserToTenant(regularUser.id, tenant2.id);
    
    // Remove from tenant 1
    await tenantService.removeUserFromTenant(regularUser.id, tenant1.id);
    
    // Check remaining tenants
    const userTenants = await tenantService.getUserTenants(regularUser.id);
    expect(userTenants.length).toBe(1);
    expect(userTenants[0].id).toBe(tenant2.id);
    
    // Verify tenant 1 access removed
    const canAccess = await tenantService.userCanAccessTenant(regularUser.id, tenant1.id);
    expect(canAccess).toBe(false);
  });
});
```

### 4. Tenant-aware API Integration

Test that API endpoints properly respect tenant context:

```typescript
// Example: Tenant-aware API integration test
describe('Tenant-aware API Integration', () => {
  let apiClient: any;
  let user: any;
  let tenant1: any;
  let tenant2: any;
  
  beforeEach(async () => {
    // Create test user and tenants
    user = await userService.createUser({
      email: 'api-test@example.com',
      password: 'password123'
    });
    
    tenant1 = await tenantService.createTenant('API Tenant 1');
    tenant2 = await tenantService.createTenant('API Tenant 2');
    
    // Add user to both tenants
    await tenantService.addUserToTenant(user.id, tenant1.id);
    await tenantService.addUserToTenant(user.id, tenant2.id);
    
    // Create API client
    apiClient = createTestApiClient();
    
    // Login to get auth token
    const { token } = await apiClient.login({
      email: 'api-test@example.com',
      password: 'password123'
    });
    
    // Set auth token for subsequent requests
    apiClient.setToken(token);
  });
  
  test('should respect tenant header in API requests', async () => {
    // Create data in each tenant
    await tenantService.setCurrentTenant(user.id, tenant1.id);
    const doc1 = await documentService.createDocument({
      title: 'Tenant 1 API Doc',
      content: 'API test content',
      userId: user.id
    });
    
    await tenantService.setCurrentTenant(user.id, tenant2.id);
    const doc2 = await documentService.createDocument({
      title: 'Tenant 2 API Doc',
      content: 'API test content',
      userId: user.id
    });
    
    // API request with tenant 1 context
    const response1 = await apiClient.get('/api/documents', {
      headers: { 'X-Tenant-ID': tenant1.id }
    });
    
    expect(response1.status).toBe(200);
    expect(response1.data.length).toBe(1);
    expect(response1.data[0].title).toBe('Tenant 1 API Doc');
    
    // API request with tenant 2 context
    const response2 = await apiClient.get('/api/documents', {
      headers: { 'X-Tenant-ID': tenant2.id }
    });
    
    expect(response2.status).toBe(200);
    expect(response2.data.length).toBe(1);
    expect(response2.data[0].title).toBe('Tenant 2 API Doc');
  });
  
  test('should reject API requests without tenant context', async () => {
    // Request without tenant header
    const response = await apiClient.get('/api/documents');
    
    // Should request tenant ID
    expect(response.status).toBe(400);
    expect(response.data.error).toContain('tenant');
  });
  
  test('should reject API requests with invalid tenant', async () => {
    // Request with invalid tenant
    const response = await apiClient.get('/api/documents', {
      headers: { 'X-Tenant-ID': 'invalid-tenant-id' }
    });
    
    expect(response.status).toBe(403);
  });
});
```

### 5. Tenant Creation and Management

Test tenant lifecycle management:

```typescript
// Example: Tenant lifecycle management test
describe('Tenant Lifecycle Management', () => {
  let adminUser: any;
  let regularUser: any;
  
  beforeEach(async () => {
    // Create admin and regular users
    adminUser = await userService.createUser({
      email: 'tenant-admin@example.com',
      password: 'password123',
      isSystemAdmin: true
    });
    
    regularUser = await userService.createUser({
      email: 'tenant-user@example.com',
      password: 'password123'
    });
  });
  
  test('should create tenant and assign owner role', async () => {
    // Create tenant with owner
    const tenant = await tenantService.createTenant('New Tenant', {
      ownerId: regularUser.id
    });
    
    // Verify tenant exists
    expect(tenant.id).toBeDefined();
    expect(tenant.name).toBe('New Tenant');
    
    // Verify user has owner role
    const hasOwnerRole = await rbacService.userHasRole(
      regularUser.id,
      'owner',
      tenant.id
    );
    expect(hasOwnerRole).toBe(true);
    
    // Verify tenant shows in user's tenants
    const userTenants = await tenantService.getUserTenants(regularUser.id);
    expect(userTenants.length).toBe(1);
    expect(userTenants[0].id).toBe(tenant.id);
  });
  
  test('should implement tenant usage limits', async () => {
    // Create tenant with usage limits
    const tenant = await tenantService.createTenant('Limited Tenant', {
      ownerId: regularUser.id,
      limits: {
        maxUsers: 5,
        maxStorage: 1024 * 1024 * 100 // 100 MB
      }
    });
    
    // Add users up to limit
    for (let i = 0; i < 4; i++) {
      const user = await userService.createUser({
        email: `user${i}@example.com`,
        password: 'password123'
      });
      await tenantService.addUserToTenant(user.id, tenant.id);
    }
    
    // Verify user count
    const tenantUsers = await tenantService.getTenantUsers(tenant.id);
    expect(tenantUsers.length).toBe(5); // 4 added + owner
    
    // Try to add one more (should fail)
    const extraUser = await userService.createUser({
      email: 'extra@example.com',
      password: 'password123'
    });
    
    await expect(
      tenantService.addUserToTenant(extraUser.id, tenant.id)
    ).rejects.toThrow(/limit exceeded/i);
  });
  
  test('should archive tenant properly', async () => {
    // Create tenant
    const tenant = await tenantService.createTenant('Archived Tenant', {
      ownerId: regularUser.id
    });
    
    // Archive tenant
    await tenantService.archiveTenant(tenant.id);
    
    // Verify tenant is archived
    const archivedTenant = await tenantService.getTenant(tenant.id);
    expect(archivedTenant.status).toBe('archived');
    
    // Verify data access is blocked
    await tenantService.setCurrentTenant(regularUser.id, tenant.id);
    
    await expect(
      documentService.createDocument({
        title: 'Should Fail',
        content: 'Content',
        userId: regularUser.id
      })
    ).rejects.toThrow(/archived/i);
  });
});
```

## Testing Multi-tenant Edge Cases

### 1. Shared Resources Between Tenants

Test handling of resources that can be shared across tenants:

```typescript
// Example: Shared resources test
describe('Shared Resource Management', () => {
  let systemAdmin: any;
  let tenant1: any;
  let tenant2: any;
  let sharedResourceId: string;
  
  beforeEach(async () => {
    // Setup system admin
    systemAdmin = await userService.createUser({
      email: 'sys-admin@example.com',
      password: 'password123',
      isSystemAdmin: true
    });
    
    // Create tenants
    tenant1 = await tenantService.createTenant('Tenant 1');
    tenant2 = await tenantService.createTenant('Tenant 2');
    
    // Create shared resource
    const sharedResource = await sharedResourceService.createSharedResource({
      name: 'Shared Template',
      type: 'template',
      content: 'Shared content',
      createdBy: systemAdmin.id,
      isGlobal: true
    });
    
    sharedResourceId = sharedResource.id;
  });
  
  test('should allow access to shared resources from all tenants', async () => {
    // Create users in each tenant
    const user1 = await userService.createUser({
      email: 'user1@example.com',
      password: 'password123'
    });
    await tenantService.addUserToTenant(user1.id, tenant1.id);
    
    const user2 = await userService.createUser({
      email: 'user2@example.com',
      password: 'password123'
    });
    await tenantService.addUserToTenant(user2.id, tenant2.id);
    
    // Check access from tenant 1
    await tenantService.setCurrentTenant(user1.id, tenant1.id);
    const resource1 = await sharedResourceService.getSharedResource(sharedResourceId);
    expect(resource1).toBeDefined();
    expect(resource1.name).toBe('Shared Template');
    
    // Check access from tenant 2
    await tenantService.setCurrentTenant(user2.id, tenant2.id);
    const resource2 = await sharedResourceService.getSharedResource(sharedResourceId);
    expect(resource2).toBeDefined();
    expect(resource2.name).toBe('Shared Template');
  });
  
  test('should correctly handle tenant-specific customizations of shared resources', async () => {
    // Create user in tenant 1
    const user1 = await userService.createUser({
      email: 'customizer@example.com',
      password: 'password123'
    });
    await tenantService.addUserToTenant(user1.id, tenant1.id);
    
    // Customize shared resource for tenant 1
    await tenantService.setCurrentTenant(user1.id, tenant1.id);
    
    const customization = await sharedResourceService.customizeSharedResource({
      sharedResourceId,
      tenantId: tenant1.id,
      customizations: {
        title: 'Tenant 1 Custom Title',
        theme: 'dark'
      }
    });
    
    // Get customized resource in tenant 1 context
    const customized = await sharedResourceService.getSharedResourceWithCustomizations(
      sharedResourceId,
      tenant1.id
    );
    
    expect(customized.name).toBe('Shared Template'); // Base property
    expect(customized.customizations.title).toBe('Tenant 1 Custom Title'); // Tenant-specific
    expect(customized.customizations.theme).toBe('dark'); // Tenant-specific
    
    // Check same resource in tenant 2 has no customizations
    const uncustomized = await sharedResourceService.getSharedResourceWithCustomizations(
      sharedResourceId,
      tenant2.id
    );
    
    expect(uncustomized.name).toBe('Shared Template'); // Base property
    expect(uncustomized.customizations).toEqual({}); // No tenant customizations
  });
});
```

### 2. Tenant-specific Configurations

Test tenant-specific configuration handling:

```typescript
// Example: Tenant configuration test
describe('Tenant Configuration Management', () => {
  let tenant1: any;
  let tenant2: any;
  
  beforeEach(async () => {
    // Create tenants
    tenant1 = await tenantService.createTenant('Config Tenant 1');
    tenant2 = await tenantService.createTenant('Config Tenant 2');
    
    // Set different configurations
    await configService.setTenantConfig(tenant1.id, 'theme', {
      primaryColor: '#ff0000',
      secondaryColor: '#00ff00',
      darkMode: true
    });
    
    await configService.setTenantConfig(tenant2.id, 'theme', {
      primaryColor: '#0000ff',
      secondaryColor: '#ffff00',
      darkMode: false
    });
  });
  
  test('should apply tenant-specific configurations', async () => {
    // Create users in each tenant
    const user1 = await userService.createUser({ email: 'config1@example.com' });
    const user2 = await userService.createUser({ email: 'config2@example.com' });
    
    await tenantService.addUserToTenant(user1.id, tenant1.id);
    await tenantService.addUserToTenant(user2.id, tenant2.id);
    
    // Get configurations in tenant 1 context
    await tenantService.setCurrentTenant(user1.id, tenant1.id);
    const config1 = await configService.getTenantConfig('theme');
    
    expect(config1.primaryColor).toBe('#ff0000');
    expect(config1.darkMode).toBe(true);
    
    // Get configurations in tenant 2 context
    await tenantService.setCurrentTenant(user2.id, tenant2.id);
    const config2 = await configService.getTenantConfig('theme');
    
    expect(config2.primaryColor).toBe('#0000ff');
    expect(config2.darkMode).toBe(false);
  });
  
  test('should fall back to default configurations when tenant-specific not found', async () => {
    // Set system default
    await configService.setDefaultConfig('notifications', {
      emailEnabled: true,
      pushEnabled: false
    });
    
    // Override in tenant 1 only
    await configService.setTenantConfig(tenant1.id, 'notifications', {
      emailEnabled: false,
      pushEnabled: true
    });
    
    // Create users in each tenant
    const user1 = await userService.createUser({ email: 'notify1@example.com' });
    const user2 = await userService.createUser({ email: 'notify2@example.com' });
    
    await tenantService.addUserToTenant(user1.id, tenant1.id);
    await tenantService.addUserToTenant(user2.id, tenant2.id);
    
    // Get configurations in tenant 1 context (overridden)
    await tenantService.setCurrentTenant(user1.id, tenant1.id);
    const config1 = await configService.getTenantConfig('notifications');
    
    expect(config1.emailEnabled).toBe(false);
    expect(config1.pushEnabled).toBe(true);
    
    // Get configurations in tenant 2 context (default)
    await tenantService.setCurrentTenant(user2.id, tenant2.id);
    const config2 = await configService.getTenantConfig('notifications');
    
    expect(config2.emailEnabled).toBe(true);
    expect(config2.pushEnabled).toBe(false);
  });
});
```

## Related Documentation

- **[INTEGRATION_TESTING.md](INTEGRATION_TESTING.md)**: Comprehensive integration testing strategy
- **[COMPONENT_INTEGRATION_MAP.md](COMPONENT_INTEGRATION_MAP.md)**: Component integration mapping
- **[../implementation/INTEGRATION_TEST_STRATEGY.md](../implementation/INTEGRATION_TEST_STRATEGY.md)**: Implementation guide
- **[../multitenancy/DATA_ISOLATION.md](../multitenancy/DATA_ISOLATION.md)**: Multi-tenant data isolation patterns
- **[../TEST_FRAMEWORK.md](../TEST_FRAMEWORK.md)**: Overall testing framework

## Version History

- **1.0.0**: Initial multi-tenant integration testing document (2025-05-23)
