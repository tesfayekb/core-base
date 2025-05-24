
# RBAC Testing Strategy

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document outlines the comprehensive testing strategy for the Role-Based Access Control (RBAC) system, covering various testing approaches, methodologies, and patterns to ensure the permission system functions correctly and securely.

## Testing Categories

### 1. Unit Testing

Unit tests focus on individual components of the RBAC system:

#### Permission Check Function Tests

```typescript
// Permission service unit tests
import { PermissionService } from '../services/PermissionService';

describe('PermissionService', () => {
  let permissionService: PermissionService;
  let mockClient: any;
  
  beforeEach(() => {
    mockClient = {
      rpc: jest.fn()
    };
    
    permissionService = new PermissionService(mockClient);
  });
  
  test('should return true for SuperAdmin', async () => {
    // Arrange
    mockClient.rpc
      .mockResolvedValueOnce({ data: true, error: null }) // isSuperAdmin call
    
    // Act
    const result = await permissionService.checkPermission({
      userId: 'user-123',
      resource: 'documents',
      action: 'view'
    });
    
    // Assert
    expect(result).toBe(true);
    expect(mockClient.rpc).toHaveBeenCalledWith('is_super_admin', {
      p_user_id: 'user-123'
    });
  });
  
  test('should check permission when not SuperAdmin', async () => {
    // Arrange
    mockClient.rpc
      .mockResolvedValueOnce({ data: false, error: null }) // isSuperAdmin call
      .mockResolvedValueOnce({ data: true, error: null }); // check_user_permission call
    
    // Act
    const result = await permissionService.checkPermission({
      userId: 'user-123',
      resource: 'documents',
      action: 'view'
    });
    
    // Assert
    expect(result).toBe(true);
    expect(mockClient.rpc).toHaveBeenCalledWith('is_super_admin', {
      p_user_id: 'user-123'
    });
    expect(mockClient.rpc).toHaveBeenCalledWith('check_user_permission', {
      p_user_id: 'user-123',
      p_action: 'view',
      p_resource_type: 'documents',
      p_tenant_id: undefined
    });
  });
  
  test('should use cache for repeated calls', async () => {
    // Arrange
    mockClient.rpc
      .mockResolvedValueOnce({ data: false, error: null }) // isSuperAdmin call
      .mockResolvedValueOnce({ data: true, error: null }); // check_user_permission call
    
    // Act
    const result1 = await permissionService.checkPermission({
      userId: 'user-123',
      resource: 'documents',
      action: 'view'
    });
    
    const result2 = await permissionService.checkPermission({
      userId: 'user-123',
      resource: 'documents',
      action: 'view'
    });
    
    // Assert
    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(mockClient.rpc).toHaveBeenCalledTimes(2); // Only called twice, not four times
  });
  
  test('should check resource-specific permission', async () => {
    // Arrange
    mockClient.rpc
      .mockResolvedValueOnce({ data: false, error: null }) // isSuperAdmin call
      .mockResolvedValueOnce({ data: true, error: null }); // check_resource_specific_permission call
    
    // Act
    const result = await permissionService.checkPermission({
      userId: 'user-123',
      resource: 'documents',
      action: 'view',
      resourceId: 'doc-123'
    });
    
    // Assert
    expect(result).toBe(true);
    expect(mockClient.rpc).toHaveBeenCalledWith('check_resource_specific_permission', {
      p_user_id: 'user-123',
      p_action: 'view',
      p_resource_type: 'documents',
      p_resource_id: 'doc-123',
      p_tenant_id: undefined
    });
  });
  
  test('should return false on error', async () => {
    // Arrange
    mockClient.rpc
      .mockResolvedValueOnce({ data: false, error: null }) // isSuperAdmin call
      .mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });
    
    // Act
    const result = await permissionService.checkPermission({
      userId: 'user-123',
      resource: 'documents',
      action: 'view'
    });
    
    // Assert
    expect(result).toBe(false);
  });
});
```

#### Permission Hook Tests

```typescript
// Permission hook unit tests
import { renderHook, act } from '@testing-library/react-hooks';
import { usePermission } from '../hooks/usePermission';
import { permissionService } from '../services/permissionService';

// Mock dependencies
jest.mock('../services/permissionService');
jest.mock('./useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
    currentTenantId: 'tenant-456'
  })
}));

describe('usePermission', () => {
  test('should return loading state initially', () => {
    // Arrange & Act
    const { result } = renderHook(() => usePermission('documents', 'view'));
    
    // Assert
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasPermission).toBe(false);
  });
  
  test('should check permission and update state', async () => {
    // Arrange
    (permissionService.checkPermission as jest.Mock).mockResolvedValueOnce(true);
    
    // Act
    const { result, waitForNextUpdate } = renderHook(() => 
      usePermission('documents', 'view')
    );
    
    await waitForNextUpdate();
    
    // Assert
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasPermission).toBe(true);
    expect(permissionService.checkPermission).toHaveBeenCalledWith({
      userId: 'user-123',
      resource: 'documents',
      action: 'view',
      resourceId: undefined,
      tenantId: 'tenant-456'
    });
  });
  
  test('should handle permission denial', async () => {
    // Arrange
    (permissionService.checkPermission as jest.Mock).mockResolvedValueOnce(false);
    
    // Act
    const { result, waitForNextUpdate } = renderHook(() => 
      usePermission('documents', 'delete')
    );
    
    await waitForNextUpdate();
    
    // Assert
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasPermission).toBe(false);
  });
  
  test('should handle errors', async () => {
    // Arrange
    const errorMessage = 'Permission check failed';
    (permissionService.checkPermission as jest.Mock).mockRejectedValueOnce(
      new Error(errorMessage)
    );
    
    // Act
    const { result, waitForNextUpdate } = renderHook(() => 
      usePermission('documents', 'view')
    );
    
    await waitForNextUpdate();
    
    // Assert
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasPermission).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });
  
  test('should handle missing user', async () => {
    // Arrange
    jest.mock('./useAuth', () => ({
      useAuth: () => ({
        user: null,
        currentTenantId: null
      })
    }));
    
    // Act
    const { result, waitForNextUpdate } = renderHook(() => 
      usePermission('documents', 'view')
    );
    
    await waitForNextUpdate();
    
    // Assert
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasPermission).toBe(false);
    expect(permissionService.checkPermission).not.toHaveBeenCalled();
  });
});
```

### 2. Integration Testing

Integration tests verify that RBAC components work correctly together:

#### Permission Flow Integration Tests

```typescript
// Permission flow integration tests
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../providers/AuthProvider';
import { PermissionButton } from '../components/PermissionButton';
import { permissionService } from '../services/permissionService';

// Mock dependencies
jest.mock('../services/permissionService');

describe('Permission Flow Integration', () => {
  test('should show and enable button when user has permission', async () => {
    // Arrange
    (permissionService.checkPermission as jest.Mock).mockResolvedValueOnce(true);
    
    const handleClick = jest.fn();
    
    // Act
    render(
      <AuthProvider>
        <PermissionButton
          resource="documents"
          action="create"
          onClick={handleClick}
        >
          Create Document
        </PermissionButton>
      </AuthProvider>
    );
    
    // Wait for permission check to complete
    await waitFor(() => {
      const button = screen.getByText('Create Document');
      expect(button).not.toBeDisabled();
    });
    
    // Click the button
    userEvent.click(screen.getByText('Create Document'));
    
    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  test('should disable button when user lacks permission', async () => {
    // Arrange
    (permissionService.checkPermission as jest.Mock).mockResolvedValueOnce(false);
    
    const handleClick = jest.fn();
    
    // Act
    render(
      <AuthProvider>
        <PermissionButton
          resource="documents"
          action="create"
          onClick={handleClick}
        >
          Create Document
        </PermissionButton>
      </AuthProvider>
    );
    
    // Wait for permission check to complete
    await waitFor(() => {
      const button = screen.getByText('Create Document');
      expect(button).toBeDisabled();
    });
    
    // Try to click the button (should be disabled)
    userEvent.click(screen.getByText('Create Document'));
    
    // Assert
    expect(handleClick).not.toHaveBeenCalled();
  });
  
  test('should hide component when user lacks permission', async () => {
    // Arrange
    (permissionService.checkPermission as jest.Mock).mockResolvedValueOnce(false);
    
    // Act
    render(
      <AuthProvider>
        <PermissionGuard
          resource="documents"
          action="create"
        >
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGuard>
      </AuthProvider>
    );
    
    // Wait for permission check to complete
    await waitFor(() => {
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });
  
  test('should show component when user has permission', async () => {
    // Arrange
    (permissionService.checkPermission as jest.Mock).mockResolvedValueOnce(true);
    
    // Act
    render(
      <AuthProvider>
        <PermissionGuard
          resource="documents"
          action="create"
        >
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGuard>
      </AuthProvider>
    );
    
    // Wait for permission check to complete
    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });
});
```

#### API Permission Integration Tests

```typescript
// API permission integration tests
import request from 'supertest';
import express from 'express';
import { createPermissionMiddleware } from '../middleware/permissionMiddleware';
import { PermissionService } from '../services/PermissionService';

describe('Permission Middleware Integration', () => {
  let app: express.Application;
  let mockPermissionService: any;
  
  beforeEach(() => {
    mockPermissionService = {
      checkPermission: jest.fn()
    };
    
    app = express();
    app.use(express.json());
    
    // Mock auth middleware to set user
    app.use((req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });
    
    const requirePermission = createPermissionMiddleware(
      mockPermissionService as PermissionService
    );
    
    // Set up test routes
    app.get(
      '/api/documents',
      requirePermission('documents', 'viewAny'),
      (req, res) => {
        res.json({ message: 'Documents list' });
      }
    );
    
    app.get(
      '/api/documents/:id',
      requirePermission('documents', 'view', { resourceIdParam: 'id' }),
      (req, res) => {
        res.json({ id: req.params.id, message: 'Document details' });
      }
    );
  });
  
  test('should allow access when user has permission', async () => {
    // Arrange
    mockPermissionService.checkPermission.mockResolvedValueOnce(true);
    
    // Act
    const response = await request(app)
      .get('/api/documents')
      .set('x-tenant-id', 'tenant-456');
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Documents list' });
    expect(mockPermissionService.checkPermission).toHaveBeenCalledWith({
      userId: 'user-123',
      resource: 'documents',
      action: 'viewAny',
      resourceId: undefined,
      tenantId: 'tenant-456'
    });
  });
  
  test('should deny access when user lacks permission', async () => {
    // Arrange
    mockPermissionService.checkPermission.mockResolvedValueOnce(false);
    
    // Act
    const response = await request(app)
      .get('/api/documents')
      .set('x-tenant-id', 'tenant-456');
    
    // Assert
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Permission denied' });
  });
  
  test('should check resource-specific permission', async () => {
    // Arrange
    mockPermissionService.checkPermission.mockResolvedValueOnce(true);
    const documentId = 'doc-123';
    
    // Act
    const response = await request(app)
      .get(`/api/documents/${documentId}`)
      .set('x-tenant-id', 'tenant-456');
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: documentId,
      message: 'Document details'
    });
    expect(mockPermissionService.checkPermission).toHaveBeenCalledWith({
      userId: 'user-123',
      resource: 'documents',
      action: 'view',
      resourceId: documentId,
      tenantId: 'tenant-456'
    });
  });
});
```

### 3. End-to-End Testing

End-to-end tests verify that the RBAC system functions correctly in a realistic environment:

```typescript
// End-to-end test example
describe('RBAC End-to-End Tests', () => {
  let browser: Browser;
  let page: Page;
  let testUsers: {
    admin: { email: string; password: string };
    basicUser: { email: string; password: string };
  };
  
  beforeAll(async () => {
    browser = await puppeteer.launch();
    
    // Set up test users
    testUsers = {
      admin: {
        email: 'admin@example.com',
        password: 'admin-password'
      },
      basicUser: {
        email: 'user@example.com',
        password: 'user-password'
      }
    };
    
    // Create test users and assign roles (implementation depends on your system)
    await setupTestUsers(testUsers);
  });
  
  afterAll(async () => {
    await browser.close();
    
    // Clean up test users
    await cleanupTestUsers(testUsers);
  });
  
  beforeEach(async () => {
    page = await browser.newPage();
  });
  
  afterEach(async () => {
    await page.close();
  });
  
  async function loginAs(userType: 'admin' | 'basicUser') {
    const user = testUsers[userType];
    
    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('input[name=email]');
    
    await page.type('input[name=email]', user.email);
    await page.type('input[name=password]', user.password);
    
    await page.click('button[type=submit]');
    await page.waitForNavigation();
  }
  
  test('Admin should see user management section', async () => {
    // Arrange & Act
    await loginAs('admin');
    await page.goto('http://localhost:3000/dashboard');
    
    // Assert
    const userManagementLink = await page.waitForSelector('[data-testid=user-management-link]');
    expect(userManagementLink).toBeTruthy();
  });
  
  test('Basic user should not see user management section', async () => {
    // Arrange & Act
    await loginAs('basicUser');
    await page.goto('http://localhost:3000/dashboard');
    
    // Assert
    let userManagementLink = null;
    try {
      userManagementLink = await page.waitForSelector('[data-testid=user-management-link]', { timeout: 2000 });
    } catch (e) {
      // Element not found, which is expected
    }
    expect(userManagementLink).toBeNull();
  });
  
  test('Admin should be able to create users', async () => {
    // Arrange & Act
    await loginAs('admin');
    await page.goto('http://localhost:3000/users');
    
    // Click create user button
    await page.waitForSelector('[data-testid=create-user-button]');
    await page.click('[data-testid=create-user-button]');
    
    // Fill and submit user form
    await page.waitForSelector('input[name=email]');
    await page.type('input[name=email]', 'newuser@example.com');
    await page.type('input[name=name]', 'New User');
    await page.click('button[type=submit]');
    
    // Assert user was created
    await page.waitForSelector('.toast-success');
    const successMessage = await page.$eval('.toast-success', el => el.textContent);
    expect(successMessage).toContain('User created');
  });
  
  test('Basic user should be denied access to user creation', async () => {
    // Arrange & Act
    await loginAs('basicUser');
    
    // Try to navigate directly to user creation page
    await page.goto('http://localhost:3000/users/new');
    
    // Assert
    // Should be redirected to access denied page
    await page.waitForSelector('[data-testid=access-denied]');
    const title = await page.$eval('[data-testid=access-denied] h1', el => el.textContent);
    expect(title).toContain('Access Denied');
  });
});
```

### 4. SQL Function Tests

Database-level permission functions should be tested:

```sql
-- Permission function tests
BEGIN;

-- 1. Create test data
DO $$
BEGIN
  -- Create test users
  INSERT INTO users (id, email, name) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'admin@example.com', 'Admin User'),
    ('00000000-0000-0000-0000-000000000002', 'user@example.com', 'Basic User');
  
  -- Create test tenants  
  INSERT INTO tenants (id, name) VALUES
    ('00000000-0000-0000-0000-000000000010', 'Test Tenant 1'),
    ('00000000-0000-0000-0000-000000000011', 'Test Tenant 2');
  
  -- Create test resources
  INSERT INTO resources (id, name) VALUES
    ('00000000-0000-0000-0000-000000000020', 'documents'),
    ('00000000-0000-0000-0000-000000000021', 'users');
  
  -- Create test permissions
  INSERT INTO permissions (id, resource_id, action) VALUES
    ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000020', 'view'),
    ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000020', 'create'),
    ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000021', 'view');
  
  -- Create test roles
  INSERT INTO roles (id, name) VALUES
    ('00000000-0000-0000-0000-000000000040', 'SuperAdmin'),
    ('00000000-0000-0000-0000-000000000041', 'BasicRole');
  
  -- Assign permissions to roles
  INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000030'); -- BasicRole can view documents
  
  -- Assign roles to users
  INSERT INTO user_roles (user_id, role_id) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000040'), -- Admin user has SuperAdmin role
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000041'); -- Basic user has BasicRole
  
  -- Add tenant relationships
  INSERT INTO user_tenants (user_id, tenant_id) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010');
END $$;

-- 2. Test is_super_admin function
DO $$
DECLARE
  admin_result BOOLEAN;
  user_result BOOLEAN;
BEGIN
  SELECT is_super_admin('00000000-0000-0000-0000-000000000001') INTO admin_result;
  SELECT is_super_admin('00000000-0000-0000-0000-000000000002') INTO user_result;
  
  ASSERT admin_result = TRUE, 'Admin user should be SuperAdmin';
  ASSERT user_result = FALSE, 'Basic user should not be SuperAdmin';
END $$;

-- 3. Test check_user_permission function
DO $$
DECLARE
  admin_view_documents BOOLEAN;
  admin_create_documents BOOLEAN;
  admin_view_users BOOLEAN;
  
  user_view_documents BOOLEAN;
  user_create_documents BOOLEAN;
  user_view_users BOOLEAN;
BEGIN
  -- Admin user should have all permissions (SuperAdmin)
  SELECT check_user_permission('00000000-0000-0000-0000-000000000001', 'view', 'documents') 
    INTO admin_view_documents;
  SELECT check_user_permission('00000000-0000-0000-0000-000000000001', 'create', 'documents') 
    INTO admin_create_documents;
  SELECT check_user_permission('00000000-0000-0000-0000-000000000001', 'view', 'users') 
    INTO admin_view_users;
  
  -- Basic user should only have assigned permissions
  SELECT check_user_permission('00000000-0000-0000-0000-000000000002', 'view', 'documents') 
    INTO user_view_documents;
  SELECT check_user_permission('00000000-0000-0000-0000-000000000002', 'create', 'documents') 
    INTO user_create_documents;
  SELECT check_user_permission('00000000-0000-0000-0000-000000000002', 'view', 'users') 
    INTO user_view_users;
  
  -- Assertions
  ASSERT admin_view_documents = TRUE, 'Admin should be able to view documents';
  ASSERT admin_create_documents = TRUE, 'Admin should be able to create documents';
  ASSERT admin_view_users = TRUE, 'Admin should be able to view users';
  
  ASSERT user_view_documents = TRUE, 'User should be able to view documents';
  ASSERT user_create_documents = FALSE, 'User should not be able to create documents';
  ASSERT user_view_users = FALSE, 'User should not be able to view users';
END $$;

-- 4. Clean up test data
ROLLBACK;
```

### 5. Performance Testing

Performance tests ensure the permission system remains efficient:

```typescript
// Permission performance tests
describe('Permission System Performance', () => {
  let permissionService: PermissionService;
  let testUserId: string;
  
  beforeAll(async () => {
    permissionService = new PermissionService();
    
    // Set up test user with many roles for performance testing
    testUserId = await setupPerformanceTestUser();
  });
  
  afterAll(async () => {
    await cleanupPerformanceTestUser(testUserId);
  });
  
  test('should efficiently check permission with cache', async () => {
    // First check (uncached)
    const startUncached = performance.now();
    
    await permissionService.checkPermission({
      userId: testUserId,
      resource: 'documents',
      action: 'view'
    });
    
    const endUncached = performance.now();
    const uncachedDuration = endUncached - startUncached;
    
    // Second check (should be cached)
    const startCached = performance.now();
    
    await permissionService.checkPermission({
      userId: testUserId,
      resource: 'documents',
      action: 'view'
    });
    
    const endCached = performance.now();
    const cachedDuration = endCached - startCached;
    
    // Assert
    expect(cachedDuration).toBeLessThan(uncachedDuration * 0.1); // Cached should be 10x faster
    expect(cachedDuration).toBeLessThan(10); // Cached should be under 10ms
  });
  
  test('should perform well with multiple concurrent permission checks', async () => {
    // Generate 100 different permission checks
    const permissionChecks = Array.from({ length: 100 }, (_, i) => ({
      userId: testUserId,
      resource: `resource-${i % 10}`,
      action: `action-${i % 5}`
    }));
    
    // Run all checks concurrently
    const start = performance.now();
    
    await Promise.all(
      permissionChecks.map(check => 
        permissionService.checkPermission(check)
      )
    );
    
    const end = performance.now();
    const duration = end - start;
    
    // Assert
    expect(duration).toBeLessThan(2000); // Should complete under 2 seconds
    expect(duration / permissionChecks.length).toBeLessThan(20); // Average under 20ms per check
  });
  
  test('should handle permission checks with role invalidation', async () => {
    // Initial check
    await permissionService.checkPermission({
      userId: testUserId,
      resource: 'documents',
      action: 'view'
    });
    
    // Invalidate cache
    permissionService.invalidateCache(testUserId);
    
    // Check again after invalidation
    const start = performance.now();
    
    await permissionService.checkPermission({
      userId: testUserId,
      resource: 'documents',
      action: 'view'
    });
    
    const end = performance.now();
    const duration = end - start;
    
    // Assert
    expect(duration).toBeLessThan(100); // Should still be reasonably fast after cache invalidation
  });
});
```

## Testing Strategies

### Testing Permission UI Components

1. **Visibility Testing**: Ensure components are correctly shown/hidden based on permissions
2. **Interaction Testing**: Verify that actions are properly enabled/disabled 
3. **State Change Testing**: Check that UI updates correctly when permissions change

### Testing Permission API Guards

1. **Access Control Testing**: Verify endpoints properly restrict access
2. **Error Response Testing**: Ensure appropriate error responses for permission denials
3. **Cross-Resource Testing**: Test permissions across different resource types

### Testing Entity Boundary Enforcement

1. **Cross-Entity Access Testing**: Verify entity boundaries are enforced
2. **Tenant Isolation Testing**: Ensure data is properly isolated between tenants
3. **Super Admin Testing**: Verify superadmin permissions across boundaries

## Testing Tools and Frameworks

1. **Unit Testing**: Jest, React Testing Library
2. **API Testing**: Supertest, Postman
3. **E2E Testing**: Cypress, Playwright
4. **Performance Testing**: k6, Artillery
5. **SQL Testing**: pgTAP, custom test functions

## Testing Best Practices

1. **Isolation**: Test permissions in isolation from other system components
2. **Comprehensive Coverage**: Test all permission types and combinations
3. **Performance Awareness**: Include performance benchmarks in tests
4. **Negative Testing**: Always test permission denials, not just grants
5. **Boundary Testing**: Test edge cases and boundary conditions

## Related Documentation

- **[README.md](README.md)**: RBAC system overview
- **[PERMISSION_IMPLEMENTATION_GUIDE.md](PERMISSION_IMPLEMENTATION_GUIDE.md)**: Implementation guide
- **[permission-resolution/RESOLUTION_ALGORITHM_CORE.md](permission-resolution/RESOLUTION_ALGORITHM_CORE.md)**: Resolution algorithm details
- **[../TEST_FRAMEWORK.md](../TEST_FRAMEWORK.md)**: Overall testing framework

## Version History

- **1.0.0**: Initial RBAC testing strategy document (2025-05-22)
