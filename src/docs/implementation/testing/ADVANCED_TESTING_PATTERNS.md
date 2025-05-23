
# Advanced Testing Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Advanced testing patterns for complex scenarios and integration testing.

## Integration Testing Patterns

### End-to-End Flow Testing
```typescript
describe('Complete User Onboarding Flow', () => {
  test('should complete full user registration to tenant access', async () => {
    // 1. Register user
    const registrationResult = await authService.register({
      email: 'integration@example.com',
      password: 'SecurePassword123!',
      firstName: 'Integration',
      lastName: 'Test'
    });

    // 2. Verify email
    await authService.verifyEmail(registrationResult.verificationToken);
    
    // 3. Login
    const loginResult = await authService.login({
      email: 'integration@example.com',
      password: 'SecurePassword123!'
    });

    // 4. Create tenant
    const tenant = await tenantService.create({
      name: 'Integration Test Org',
      ownerId: registrationResult.user.id
    });

    // 5. Verify permissions
    const canManage = await rbacService.checkPermission({
      userId: registrationResult.user.id,
      tenantId: tenant.id,
      resource: 'users',
      action: 'manage'
    });

    expect(canManage).toBe(true);
  });
});
```

### Performance Integration Testing
```typescript
describe('Performance Under Load', () => {
  test('should maintain performance with concurrent operations', async () => {
    const concurrentUsers = 10;
    const operations = Array.from({ length: concurrentUsers }, (_, i) => 
      performCompleteUserFlow(`user${i}@example.com`)
    );

    const startTime = performance.now();
    const results = await Promise.allSettled(operations);
    const totalTime = performance.now() - startTime;

    const successfulOperations = results.filter(r => r.status === 'fulfilled').length;
    expect(successfulOperations).toBe(concurrentUsers);
    expect(totalTime / concurrentUsers).toBeLessThan(2000); // Average 2s per user
  });
});
```

## Error Handling Testing

### Security Error Testing
```typescript
describe('Security Error Handling', () => {
  test('should handle unauthorized access attempts', async () => {
    const unauthorizedUser = await createTestUser({ role: 'basic-user' });
    
    await expect(
      adminService.deleteUser(unauthorizedUser.id, 'target-user-id')
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should prevent cross-tenant data access', async () => {
    const user1 = await createTestUser({ tenantId: 'tenant-1' });
    const user2Data = await createTestUser({ tenantId: 'tenant-2' });
    
    await expect(
      userService.getUser(user1.id, user2Data.id)
    ).rejects.toThrow('Cross-tenant access denied');
  });
});
```

## Related Documentation

- **[CORE_TESTING_PATTERNS.md](CORE_TESTING_PATTERNS.md)**: Basic testing patterns
- **[../OVERVIEW.md](OVERVIEW.md)**: Testing integration overview

## Version History

- **1.0.0**: Extracted advanced patterns from TESTING_PATTERNS.md (2025-05-23)
