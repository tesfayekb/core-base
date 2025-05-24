
# Testing Implementation Examples

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-24

## Overview

Practical implementation examples for the testing framework with real-world scenarios and code samples.

## Unit Testing Examples

### RBAC Permission Testing
```typescript
// tests/unit/rbac/permission-checker.test.ts
import { PermissionChecker } from '../../../src/services/PermissionChecker';
import { createMockUser, createMockRole } from '../../helpers/test-factories';

describe('PermissionChecker', () => {
  let permissionChecker: PermissionChecker;
  
  beforeEach(() => {
    permissionChecker = new PermissionChecker();
  });
  
  test('should grant permission for valid user role', async () => {
    // Arrange
    const user = createMockUser({ id: 'user-1' });
    const role = createMockRole({ 
      id: 'editor', 
      permissions: ['documents:read', 'documents:write'] 
    });
    
    // Act
    const hasPermission = await permissionChecker.checkPermission(
      user.id, 
      'documents:write', 
      'tenant-1'
    );
    
    // Assert
    expect(hasPermission).toBe(true);
  });
  
  test('should deny permission for insufficient role', async () => {
    // Arrange
    const user = createMockUser({ id: 'user-2' });
    const role = createMockRole({ 
      id: 'viewer', 
      permissions: ['documents:read'] 
    });
    
    // Act
    const hasPermission = await permissionChecker.checkPermission(
      user.id, 
      'documents:delete', 
      'tenant-1'
    );
    
    // Assert
    expect(hasPermission).toBe(false);
  });
});
```

### Multi-tenant Data Isolation Testing
```typescript
// tests/unit/multitenancy/data-isolation.test.ts
import { DataService } from '../../../src/services/DataService';
import { createMockTenant, createMockDocument } from '../../helpers/test-factories';

describe('Multi-tenant Data Isolation', () => {
  let dataService: DataService;
  
  beforeEach(() => {
    dataService = new DataService();
  });
  
  test('should only return tenant-specific data', async () => {
    // Arrange
    const tenant1 = createMockTenant({ id: 'tenant-1' });
    const tenant2 = createMockTenant({ id: 'tenant-2' });
    
    const doc1 = createMockDocument({ tenantId: 'tenant-1', title: 'Doc 1' });
    const doc2 = createMockDocument({ tenantId: 'tenant-2', title: 'Doc 2' });
    
    // Act
    const tenant1Docs = await dataService.getDocuments('tenant-1');
    const tenant2Docs = await dataService.getDocuments('tenant-2');
    
    // Assert
    expect(tenant1Docs).toHaveLength(1);
    expect(tenant1Docs[0].title).toBe('Doc 1');
    expect(tenant2Docs).toHaveLength(1);
    expect(tenant2Docs[0].title).toBe('Doc 2');
  });
});
```

## Component Testing Examples

### Authentication Form Testing
```typescript
// tests/components/auth/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../../../src/components/auth/LoginForm';
import { AuthProvider } from '../../../src/contexts/AuthContext';

describe('LoginForm', () => {
  const mockLogin = jest.fn();
  
  const renderWithAuth = (component: React.ReactElement) => {
    return render(
      <AuthProvider value={{ login: mockLogin, user: null, loading: false }}>
        {component}
      </AuthProvider>
    );
  };
  
  test('should submit valid credentials', async () => {
    // Arrange
    renderWithAuth(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Act
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    // Assert
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });
  
  test('should display validation errors for invalid input', async () => {
    // Arrange
    renderWithAuth(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Act
    fireEvent.click(submitButton);
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });
});
```

### Role-Based Component Visibility Testing
```typescript
// tests/components/rbac/ProtectedComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { ProtectedComponent } from '../../../src/components/rbac/ProtectedComponent';
import { usePermissions } from '../../../src/hooks/usePermissions';

jest.mock('../../../src/hooks/usePermissions');
const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>;

describe('ProtectedComponent', () => {
  test('should render content when user has permission', () => {
    // Arrange
    mockUsePermissions.mockReturnValue({
      hasPermission: jest.fn().mockReturnValue(true),
      loading: false
    });
    
    // Act
    render(
      <ProtectedComponent permission="documents:write">
        <div>Protected Content</div>
      </ProtectedComponent>
    );
    
    // Assert
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
  
  test('should not render content when user lacks permission', () => {
    // Arrange
    mockUsePermissions.mockReturnValue({
      hasPermission: jest.fn().mockReturnValue(false),
      loading: false
    });
    
    // Act
    render(
      <ProtectedComponent permission="documents:write">
        <div>Protected Content</div>
      </ProtectedComponent>
    );
    
    // Assert
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
```

## Integration Testing Examples

### API Authentication Flow
```typescript
// tests/integration/api/auth-flow.test.ts
import request from 'supertest';
import { app } from '../../../src/app';
import { setupTestDatabase, cleanupTestDatabase } from '../../helpers/database';

describe('API Authentication Flow', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();
  });
  
  test('should complete full authentication flow', async () => {
    // 1. Register user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test@123456',
        name: 'Test User'
      });
    
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.user.email).toBe('test@example.com');
    
    // 2. Login with credentials
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test@123456'
      });
    
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();
    
    // 3. Access protected route
    const protectedResponse = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${loginResponse.body.token}`);
    
    expect(protectedResponse.status).toBe(200);
    expect(protectedResponse.body.email).toBe('test@example.com');
  });
});
```

## Performance Testing Examples

### Database Query Performance
```typescript
// tests/performance/database-queries.test.ts
import { performance } from 'perf_hooks';
import { DatabaseService } from '../../../src/services/DatabaseService';

describe('Database Query Performance', () => {
  let dbService: DatabaseService;
  
  beforeAll(async () => {
    dbService = new DatabaseService();
  });
  
  test('permission check should complete within 15ms', async () => {
    // Arrange
    const userId = 'user-1';
    const permission = 'documents:read';
    const tenantId = 'tenant-1';
    
    // Act
    const startTime = performance.now();
    await dbService.checkPermission(userId, permission, tenantId);
    const endTime = performance.now();
    
    // Assert
    const executionTime = endTime - startTime;
    expect(executionTime).toBeLessThan(15); // 15ms requirement
  });
  
  test('bulk user operations should handle 1000+ users efficiently', async () => {
    // Arrange
    const userIds = Array.from({ length: 1000 }, (_, i) => `user-${i}`);
    
    // Act
    const startTime = performance.now();
    await dbService.bulkUpdateUsers(userIds, { status: 'active' });
    const endTime = performance.now();
    
    // Assert
    const executionTime = endTime - startTime;
    expect(executionTime).toBeLessThan(500); // 500ms for 1000 users
  });
});
```

## Test Data Factories

### User Test Factory
```typescript
// tests/helpers/test-factories.ts
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-' + Math.random().toString(36).substr(2, 9),
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

export function createMockRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'role-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Role',
    permissions: ['documents:read'],
    createdAt: new Date(),
    ...overrides
  };
}

export function createMockTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'tenant-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Tenant',
    slug: 'test-tenant',
    createdAt: new Date(),
    ...overrides
  };
}
```

## E2E Testing Examples

### User Onboarding Flow
```typescript
// tests/e2e/user-onboarding.test.ts
import { test, expect } from '@playwright/test';

test.describe('User Onboarding Flow', () => {
  test('complete user registration and setup', async ({ page }) => {
    // 1. Navigate to registration
    await page.goto('/register');
    
    // 2. Fill registration form
    await page.fill('[data-testid="email-input"]', 'newuser@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.fill('[data-testid="name-input"]', 'New User');
    await page.click('[data-testid="register-button"]');
    
    // 3. Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // 4. Check welcome message
    await expect(page.locator('[data-testid="welcome-message"]'))
      .toContainText('Welcome, New User');
    
    // 5. Create first organization
    await page.click('[data-testid="create-org-button"]');
    await page.fill('[data-testid="org-name-input"]', 'My Organization');
    await page.click('[data-testid="save-org-button"]');
    
    // 6. Verify organization creation
    await expect(page.locator('[data-testid="org-name"]'))
      .toContainText('My Organization');
  });
});
```

## Related Documentation

- **[../TEST_FRAMEWORK.md](../TEST_FRAMEWORK.md)**: Overall testing framework
- **[../implementation/testing/OVERVIEW.md](../implementation/testing/OVERVIEW.md)**: Testing implementation overview
- **[../integration/README.md](../integration/README.md)**: Integration testing strategies

## Version History

- **1.0.0**: Initial implementation examples for enhanced testing documentation (2025-05-24)
