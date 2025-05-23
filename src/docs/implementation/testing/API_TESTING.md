
# API Testing Strategy

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document outlines the testing approach for API endpoints, focusing on functionality, security, and performance.

## API Testing Approach

### Endpoint Testing

```typescript
// Example of API endpoint test
import request from 'supertest';
import { app } from '../app';
import { setupTestDb, teardownTestDb } from '../utils/test-helpers';

describe('Users API', () => {
  beforeAll(async () => {
    await setupTestDb();
  });
  
  afterAll(async () => {
    await teardownTestDb();
  });
  
  describe('GET /api/users', () => {
    test('should return 401 for unauthenticated request', async () => {
      // Act
      const response = await request(app)
        .get('/api/users');
        
      // Assert
      expect(response.status).toBe(401);
    });
    
    test('should return users when authenticated as admin', async () => {
      // Arrange
      const token = await getTestToken('admin');
      
      // Act
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);
        
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
    });
    
    test('should respect tenant isolation', async () => {
      // Arrange
      const token = await getTestToken('user', 'tenant1');
      
      // Act
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);
        
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.users.every(user => user.tenantId === 'tenant1')).toBe(true);
    });
  });
  
  describe('POST /api/users', () => {
    test('should create user with valid data', async () => {
      // Arrange
      const token = await getTestToken('admin');
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
      };
      
      // Act
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send(userData);
        
      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(userData.email);
    });
    
    test('should validate input data', async () => {
      // Arrange
      const token = await getTestToken('admin');
      const userData = {
        // Missing required email
        name: 'Test User',
        role: 'user'
      };
      
      // Act
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send(userData);
        
      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });
  });
});
```

### API Performance Testing

```typescript
// Performance testing for API endpoints
describe('API Performance', () => {
  test('GET /api/users should respond within performance target', async () => {
    // Arrange
    const token = await getTestToken('admin');
    const startTime = process.hrtime();
    
    // Act
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);
      
    // Assert
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTimeMs = seconds * 1000 + nanoseconds / 1000000;
    
    expect(response.status).toBe(200);
    expect(responseTimeMs).toBeLessThan(500); // 500ms target
  });
});
```

## API Security Testing

```typescript
// Security testing for API endpoints
describe('API Security', () => {
  test('should prevent SQL injection', async () => {
    // Arrange
    const token = await getTestToken('user');
    const maliciousQuery = "'; DROP TABLE users; --";
    
    // Act
    const response = await request(app)
      .get(`/api/users?search=${maliciousQuery}`)
      .set('Authorization', `Bearer ${token}`);
      
    // Assert
    expect(response.status).not.toBe(500); // Should not crash server
    
    // Verify tables still exist by making another query
    const checkResponse = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);
      
    expect(checkResponse.status).toBe(200);
    expect(Array.isArray(checkResponse.body.users)).toBe(true);
  });
  
  test('should prevent unauthorized tenant access', async () => {
    // Arrange
    const token = await getTestToken('user', 'tenant1');
    
    // Act
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenant2'); // Trying to access different tenant
      
    // Assert
    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('tenant access');
  });
});
```

## API Load Testing

```typescript
// Load testing for API endpoints
describe('API Load Testing', () => {
  test('should handle 100 concurrent requests', async () => {
    // Arrange
    const token = await getTestToken('admin');
    const concurrentRequests = 100;
    
    // Act
    const requests = Array(concurrentRequests).fill(0).map(() => 
      request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
    );
    
    const responses = await Promise.all(requests);
    
    // Assert
    const successfulResponses = responses.filter(r => r.status === 200);
    expect(successfulResponses.length).toBe(concurrentRequests);
  });
});
```

## Related Documents

- [PERFORMANCE_STANDARDS.md](../../PERFORMANCE_STANDARDS.md): API performance targets
- [SECURITY_TESTING.md](./SECURITY_TESTING.md): Detailed API security testing

## Version History

- **1.0.0**: Initial API testing strategy (2025-05-23)
