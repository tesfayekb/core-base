
# Test Scaffolding Architecture

> **Version**: 1.2.0  
> **Last Updated**: 2025-05-22

## Overview

This document outlines the automated test scaffolding system that integrates with the resource creation process. When a new resource is defined in the system, test scaffolds are automatically generated to ensure comprehensive test coverage from the beginning of resource development.

## Automated Test Generation

### 1. Resource Registration Integration

When a new resource is registered using the Resource Registration System, the test scaffolding system is automatically triggered:

```typescript
function registerResource<T extends BaseResource>(resourceMeta: ResourceMetadata<T>) {
  // Register the resource in the main registry
  resourceRegistry.register(resourceMeta);
  
  // Automatically generate test scaffolding
  testScaffoldingService.generateTestsForResource(resourceMeta);
}
```

This integration ensures that for every resource registered (as described in [../RESOURCE_REGISTRATION.md](../../RESOURCE_REGISTRATION.md)), a complete set of test scaffolding is automatically generated. The test generation service analyzes the resource schema, permissions, and metadata to create appropriate test scenarios.

### 2. Generated Test Files Structure

For each registered resource, the following test files are automatically generated:

```
/src/tests/resources/{ResourceName}/
  ├── unit/
  │   ├── {ResourceName}Schema.test.ts        // Schema validation tests
  │   ├── {ResourceName}Utils.test.ts         // Utility function tests
  │   └── {ResourceName}Hooks.test.ts         // Custom hook tests
  ├── integration/
  │   ├── {ResourceName}Api.test.ts           // API integration tests
  │   ├── {ResourceName}Form.test.ts          // Form submission tests
  │   └── {ResourceName}Effects.test.ts       // Side effect tests
  ├── e2e/
  │   └── {ResourceName}Flows.test.ts         // End-to-end user flows
  └── {ResourceName}TestData.ts               // Test data factory
```

### 3. Test Scaffold Templates

The test scaffolding system uses the resource schema and metadata to generate appropriate tests:

#### Schema Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { ResourceSchema } from '@/resources/{ResourceName}';

describe('{ResourceName} Schema Validation', () => {
  it('validates a valid {ResourceName}', () => {
    // Tests for valid data based on schema
  });

  it('rejects invalid {ResourceName} data', () => {
    // Tests for each validation rule
  });

  // Additional tests generated based on schema properties
});
```

#### API Test Template
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { api{ResourceName}Service } from '@/services/{ResourceName}Service';

describe('{ResourceName} API', () => {
  // Setup MSW handlers for mocking API responses
  
  it('fetches {ResourceName} list successfully', () => {
    // Test GET all endpoint
  });

  it('fetches single {ResourceName} by ID', () => {
    // Test GET by ID endpoint
  });

  it('creates a new {ResourceName}', () => {
    // Test POST endpoint
  });

  it('updates an existing {ResourceName}', () => {
    // Test PUT endpoint
  });

  it('deletes a {ResourceName}', () => {
    // Test DELETE endpoint
  });

  // Permission-based tests
  it('handles unauthorized access attempts', () => {
    // Test permission boundaries
  });
});
```

## Test Data Factory Generation

For each resource, a test data factory is automatically generated to create consistent test fixtures:

```typescript
import { faker } from '@faker-js/faker';
import { {ResourceName} } from '@/types/{ResourceName}';

export const create{ResourceName} = (overrides?: Partial<{ResourceName}>): {ResourceName} => ({
  id: faker.string.uuid(),
  name: faker.lorem.word(),
  // Other properties generated based on schema type definitions
  ...overrides
});

export const createMany{ResourceName} = (count: number, overrides?: Partial<{ResourceName}>) => 
  Array.from({ length: count }, () => create{ResourceName}(overrides));
```

The data factory follows the standardized patterns defined in [../RESOURCE_FRAMEWORK.md](../../RESOURCE_FRAMEWORK.md), ensuring that:

1. All required fields from the resource schema are populated with realistic test data
2. The factory respects data types and constraints from the schema
3. Relationships between resources are maintained consistently
4. Generated data follows the same validation rules enforced by the application

## Database Test Data Management

### 1. Test Database Fixtures

For resources with database dependencies, the scaffolding system generates database fixture scripts:

```typescript
// src/tests/resources/{ResourceName}/fixtures/database.ts
import { supabase } from '@/services/database';
import { create{ResourceName} } from '../{ResourceName}TestData';

export async function seed{ResourceName}Data(count = 5, overrides?: Partial<{ResourceName}>) {
  const records = createMany{ResourceName}(count, overrides);
  
  // Insert test data with transaction support
  const { data, error } = await supabase
    .from('{resourceTableName}')
    .insert(records)
    .select();
    
  if (error) throw new Error(`Failed to seed {ResourceName} data: ${error.message}`);
  
  return data;
}

export async function cleanup{ResourceName}Data() {
  // Clean up test data - runs within a transaction
  await supabase.from('{resourceTableName}').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}
```

### 2. Transaction Handling

The scaffolding system generates test utilities for database transaction management:

```typescript
// src/tests/utils/dbTransaction.ts
import { supabase } from '@/services/database';

export async function withTestTransaction<T>(callback: () => Promise<T>): Promise<T> {
  try {
    // Start transaction
    await supabase.rpc('begin_transaction');
    
    // Execute the test within transaction
    const result = await callback();
    
    // Always rollback in test environment
    await supabase.rpc('rollback_transaction');
    
    return result;
  } catch (error) {
    // Ensure rollback on error
    await supabase.rpc('rollback_transaction').catch(() => {});
    throw error;
  }
}
```

### 3. Database State Isolation

Each scaffold includes database state isolation utilities:

```typescript
// src/tests/resources/{ResourceName}/integration/{ResourceName}Database.test.ts
import { describe, it, beforeEach, afterEach } from 'vitest';
import { withTestTransaction } from '@/tests/utils/dbTransaction';
import { seed{ResourceName}Data, cleanup{ResourceName}Data } from '../fixtures/database';

describe('{ResourceName} Database Operations', () => {
  // Setup isolated DB state for each test
  beforeEach(async () => {
    await seed{ResourceName}Data();
  });
  
  // Clean up after tests
  afterEach(async () => {
    await cleanup{ResourceName}Data();
  });
  
  it('correctly creates a {ResourceName} in the database', async () => {
    await withTestTransaction(async () => {
      // Test DB operations within transaction
    });
  });
  
  // Additional database tests
});
```

### 4. Mock Database State

For unit tests requiring database interactions, mock state generators are provided:

```typescript
// src/tests/resources/{ResourceName}/mocks/databaseMocks.ts
import { vi } from 'vitest';
import { create{ResourceName} } from '../{ResourceName}TestData';

export function mock{ResourceName}DbResponse(count = 1, overrides?: Partial<{ResourceName}>) {
  const records = createMany{ResourceName}(count, overrides);
  
  return {
    data: records,
    error: null,
    status: 200,
    statusText: 'OK',
    count: records.length
  };
}

export function setup{ResourceName}DbMocks() {
  // Setup mock database responses
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation(cb => cb(mock{ResourceName}DbResponse()))
  };
  
  return mockSupabase;
}
```

## Resource-Specific Test Scenarios

The system analyzes the resource definition to generate appropriate test scenarios:

1. **For resources with relationship dependencies**:
   - Tests for cascade operations
   - Tests for integrity constraints
   - Tests for relationship validation

2. **For resources with custom permissions**:
   - Tests for each permission boundary
   - Tests for role-based access scenarios
   - Tests for permission inheritance

3. **For resources with custom validation**:
   - Tests for each validation rule
   - Tests for cross-field validation
   - Tests for business rule constraints

## Integration with CI/CD Pipeline

1. **Pre-commit Hooks**: Verify that all generated tests pass before allowing commits
2. **Pull Request Checks**: Ensure test coverage meets thresholds for the resource type
3. **Deployment Gates**: Validate comprehensive test passage before deployment

## Resource Test Dashboard

The test scaffolding system integrates with the test dashboard to provide:

1. **Resource Test Coverage**: Visual representation of test coverage by resource
2. **Test Status Tracking**: Pass/fail status for each resource test suite
3. **Resource Test History**: Historical test results for each resource

## Related Documentation

- **[TEST_FRAMEWORK.md](TEST_FRAMEWORK.md)**: Overall testing architecture
- **[../rbac/README.md](rbac/README.md)**: RBAC system and permission testing
- **[../security/SECURITY_TESTING.md](security/SECURITY_TESTING.md)**: Security testing approach
- **[../../RESOURCE_FRAMEWORK.md](../../RESOURCE_FRAMEWORK.md)**: Resource definition framework
- **[../../RESOURCE_REGISTRATION.md](../../RESOURCE_REGISTRATION.md)**: Resource registration process

## Version History

- **1.2.0**: Enhanced integration with resource registration system and improved cross-document references
- **1.1.0**: Enhanced with comprehensive database test data management section
- **1.0.0**: Initial document creation
