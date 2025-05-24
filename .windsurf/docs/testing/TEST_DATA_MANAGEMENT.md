
# Test Data Management Strategy

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document outlines the comprehensive strategy for managing test data across all testing phases, including data generation, isolation, cleanup, and lifecycle management.

## Test Data Architecture

### Data Isolation Strategy

#### Database-Level Isolation
```typescript
// Test database configuration
interface TestDatabaseConfig {
  environment: 'unit' | 'integration' | 'e2e' | 'load';
  isolation: {
    type: 'transaction' | 'schema' | 'database';
    cleanup: 'rollback' | 'truncate' | 'recreate';
  };
  seeding: {
    enabled: boolean;
    fixtures: string[];
    factories: string[];
  };
}

// Environment-specific configurations
const testConfigs: Record<string, TestDatabaseConfig> = {
  unit: {
    environment: 'unit',
    isolation: {
      type: 'transaction',
      cleanup: 'rollback'
    },
    seeding: {
      enabled: true,
      fixtures: ['minimal-users', 'basic-permissions'],
      factories: ['user-factory', 'permission-factory']
    }
  },
  integration: {
    environment: 'integration',
    isolation: {
      type: 'schema',
      cleanup: 'truncate'
    },
    seeding: {
      enabled: true,
      fixtures: ['complete-rbac', 'multi-tenant-setup'],
      factories: ['tenant-factory', 'role-factory']
    }
  },
  e2e: {
    environment: 'e2e',
    isolation: {
      type: 'database',
      cleanup: 'recreate'
    },
    seeding: {
      enabled: true,
      fixtures: ['full-application-state'],
      factories: ['realistic-data-factory']
    }
  }
};
```

### Test Data Categories

#### 1. Static Fixtures
**Purpose**: Predictable, stable test data for consistent testing
```typescript
// User fixtures
export const userFixtures = {
  superAdmin: {
    id: 'super-admin-001',
    email: 'superadmin@test.com',
    name: 'Super Admin',
    roles: ['SuperAdmin']
  },
  tenantAdmin: {
    id: 'tenant-admin-001',
    email: 'admin@tenant1.test',
    name: 'Tenant Admin',
    roles: ['TenantAdmin'],
    tenantId: 'tenant-001'
  },
  basicUser: {
    id: 'basic-user-001',
    email: 'user@tenant1.test',
    name: 'Basic User',
    roles: ['BasicUser'],
    tenantId: 'tenant-001'
  }
};

// Permission fixtures
export const permissionFixtures = {
  documentPermissions: [
    { resource: 'documents', action: 'view', level: 'any' },
    { resource: 'documents', action: 'create', level: 'own' },
    { resource: 'documents', action: 'edit', level: 'own' },
    { resource: 'documents', action: 'delete', level: 'own' }
  ],
  userPermissions: [
    { resource: 'users', action: 'view', level: 'tenant' },
    { resource: 'users', action: 'create', level: 'tenant' },
    { resource: 'users', action: 'edit', level: 'tenant' }
  ]
};
```

#### 2. Dynamic Factories
**Purpose**: Generate varied test data for comprehensive testing
```typescript
// Data factories using faker
import { faker } from '@faker-js/faker';

export class TestDataFactory {
  static createUser(overrides: Partial<User> = {}): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      createdAt: faker.date.past(),
      isActive: true,
      ...overrides
    };
  }

  static createTenant(overrides: Partial<Tenant> = {}): Tenant {
    return {
      id: faker.string.uuid(),
      name: faker.company.name(),
      subdomain: faker.internet.domainWord(),
      settings: {
        maxUsers: faker.number.int({ min: 10, max: 1000 }),
        features: faker.helpers.arrayElements(['feature1', 'feature2', 'feature3'])
      },
      createdAt: faker.date.past(),
      ...overrides
    };
  }

  static createDocument(userId: string, tenantId: string, overrides: Partial<Document> = {}): Document {
    return {
      id: faker.string.uuid(),
      title: faker.lorem.words(3),
      content: faker.lorem.paragraphs(3),
      userId,
      tenantId,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides
    };
  }

  // Bulk data generation
  static createUsers(count: number, tenantId?: string): User[] {
    return Array.from({ length: count }, () => 
      this.createUser(tenantId ? { tenantId } : {})
    );
  }

  static createTenantWithUsers(userCount: number = 10): { tenant: Tenant; users: User[] } {
    const tenant = this.createTenant();
    const users = this.createUsers(userCount, tenant.id);
    return { tenant, users };
  }
}
```

#### 3. Realistic Data Sets
**Purpose**: Production-like data volumes for performance and load testing
```typescript
// Large dataset generation
export class LargeDatasetFactory {
  static async createEnterpriseScenario(): Promise<EnterpriseDataSet> {
    const tenants = Array.from({ length: 50 }, () => TestDataFactory.createTenant());
    
    const allUsers: User[] = [];
    const allDocuments: Document[] = [];
    
    for (const tenant of tenants) {
      // Varied user counts per tenant (10-500 users)
      const userCount = faker.number.int({ min: 10, max: 500 });
      const users = TestDataFactory.createUsers(userCount, tenant.id);
      allUsers.push(...users);
      
      // Documents per user (1-50 documents)
      for (const user of users) {
        const docCount = faker.number.int({ min: 1, max: 50 });
        const documents = Array.from({ length: docCount }, () =>
          TestDataFactory.createDocument(user.id, tenant.id)
        );
        allDocuments.push(...documents);
      }
    }
    
    return {
      tenants,
      users: allUsers,
      documents: allDocuments,
      totalRecords: tenants.length + allUsers.length + allDocuments.length
    };
  }
}
```

## Test Database Management

### Database Setup and Teardown

#### Unit Test Database Management
```typescript
// Unit test database helper
export class UnitTestDatabase {
  private transaction: any;
  
  async setup(): Promise<void> {
    // Start transaction for isolation
    this.transaction = await db.transaction();
    
    // Seed minimal required data
    await this.seedFixtures(['basic-permissions', 'test-roles']);
  }
  
  async teardown(): Promise<void> {
    // Rollback transaction to clean up
    if (this.transaction) {
      await this.transaction.rollback();
    }
  }
  
  async seedFixtures(fixtures: string[]): Promise<void> {
    for (const fixture of fixtures) {
      const data = await import(`./fixtures/${fixture}.json`);
      await this.insertFixtureData(data);
    }
  }
  
  private async insertFixtureData(data: any): Promise<void> {
    // Insert fixture data within transaction
    for (const [table, records] of Object.entries(data)) {
      await this.transaction(table).insert(records);
    }
  }
}
```

#### Integration Test Database Management
```typescript
// Integration test database helper
export class IntegrationTestDatabase {
  private schema: string;
  
  async setup(): Promise<void> {
    // Create isolated schema
    this.schema = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.raw(`CREATE SCHEMA ${this.schema}`);
    
    // Run migrations on test schema
    await this.runMigrations();
    
    // Seed comprehensive test data
    await this.seedTestData();
  }
  
  async teardown(): Promise<void> {
    // Drop test schema
    if (this.schema) {
      await db.raw(`DROP SCHEMA ${this.schema} CASCADE`);
    }
  }
  
  private async runMigrations(): Promise<void> {
    // Run all migrations on test schema
    await migrator.latest({
      schemaName: this.schema
    });
  }
  
  private async seedTestData(): Promise<void> {
    // Seed multi-tenant test scenario
    const { tenant, users } = TestDataFactory.createTenantWithUsers(20);
    
    await this.insertWithSchema('tenants', [tenant]);
    await this.insertWithSchema('users', users);
    
    // Create role assignments
    const roleAssignments = users.map(user => ({
      userId: user.id,
      roleId: 'basic-user-role',
      tenantId: tenant.id
    }));
    
    await this.insertWithSchema('user_roles', roleAssignments);
  }
  
  private async insertWithSchema(table: string, data: any[]): Promise<void> {
    await db.withSchema(this.schema).table(table).insert(data);
  }
}
```

### Test Data Versioning

#### Data Version Management
```typescript
// Test data versioning system
export class TestDataVersioning {
  private versions: Map<string, DataSnapshot> = new Map();
  
  async createSnapshot(name: string): Promise<string> {
    const snapshot: DataSnapshot = {
      id: faker.string.uuid(),
      name,
      timestamp: new Date(),
      data: await this.captureCurrentState()
    };
    
    this.versions.set(name, snapshot);
    await this.persistSnapshot(snapshot);
    
    return snapshot.id;
  }
  
  async restoreSnapshot(name: string): Promise<void> {
    const snapshot = this.versions.get(name);
    if (!snapshot) {
      throw new Error(`Snapshot ${name} not found`);
    }
    
    await this.clearCurrentData();
    await this.restoreData(snapshot.data);
  }
  
  private async captureCurrentState(): Promise<DatabaseState> {
    const tables = ['users', 'tenants', 'roles', 'permissions', 'user_roles'];
    const data: DatabaseState = {};
    
    for (const table of tables) {
      data[table] = await db.table(table).select('*');
    }
    
    return data;
  }
  
  private async restoreData(data: DatabaseState): Promise<void> {
    for (const [table, records] of Object.entries(data)) {
      if (records.length > 0) {
        await db.table(table).insert(records);
      }
    }
  }
}
```

## Test Data Lifecycle

### Data Refresh Strategies

#### Scheduled Data Refresh
```typescript
// Automated test data refresh
export class TestDataRefresh {
  private schedule: Map<string, RefreshConfig> = new Map();
  
  constructor() {
    this.setupRefreshSchedules();
  }
  
  private setupRefreshSchedules(): void {
    // Daily refresh for integration tests
    this.schedule.set('integration', {
      frequency: 'daily',
      time: '02:00',
      strategy: 'recreate'
    });
    
    // Weekly refresh for load test data
    this.schedule.set('load-test', {
      frequency: 'weekly',
      day: 'sunday',
      time: '01:00',
      strategy: 'regenerate'
    });
    
    // On-demand refresh for e2e tests
    this.schedule.set('e2e', {
      frequency: 'on-demand',
      strategy: 'reset'
    });
  }
  
  async refreshTestData(environment: string): Promise<void> {
    const config = this.schedule.get(environment);
    if (!config) {
      throw new Error(`No refresh config for environment: ${environment}`);
    }
    
    switch (config.strategy) {
      case 'recreate':
        await this.recreateDatabase(environment);
        break;
      case 'regenerate':
        await this.regenerateData(environment);
        break;
      case 'reset':
        await this.resetToBaseline(environment);
        break;
    }
  }
  
  private async recreateDatabase(environment: string): Promise<void> {
    // Drop and recreate test database
    await db.raw(`DROP DATABASE IF EXISTS test_${environment}`);
    await db.raw(`CREATE DATABASE test_${environment}`);
    
    // Run migrations and seed fresh data
    await this.runMigrations(environment);
    await this.seedFreshData(environment);
  }
}
```

### Data Cleanup Automation

#### Cleanup Orchestration
```typescript
// Test data cleanup automation
export class TestDataCleanup {
  private cleanupRules: CleanupRule[] = [];
  
  constructor() {
    this.setupCleanupRules();
  }
  
  private setupCleanupRules(): void {
    this.cleanupRules = [
      {
        name: 'expired-test-sessions',
        condition: (record) => record.expiresAt < new Date(),
        action: 'delete',
        tables: ['user_sessions']
      },
      {
        name: 'old-test-audit-logs',
        condition: (record) => record.createdAt < this.daysAgo(30),
        action: 'archive',
        tables: ['audit_logs']
      },
      {
        name: 'temporary-test-users',
        condition: (record) => record.email.includes('temp-test-'),
        action: 'delete',
        tables: ['users', 'user_roles', 'user_sessions']
      }
    ];
  }
  
  async runCleanup(): Promise<CleanupReport> {
    const report: CleanupReport = {
      startTime: new Date(),
      rules: [],
      totalRecordsProcessed: 0,
      errors: []
    };
    
    for (const rule of this.cleanupRules) {
      try {
        const ruleResult = await this.executeCleanupRule(rule);
        report.rules.push(ruleResult);
        report.totalRecordsProcessed += ruleResult.recordsProcessed;
      } catch (error) {
        report.errors.push({
          rule: rule.name,
          error: error.message
        });
      }
    }
    
    report.endTime = new Date();
    return report;
  }
  
  private async executeCleanupRule(rule: CleanupRule): Promise<RuleExecutionResult> {
    let totalProcessed = 0;
    
    for (const table of rule.tables) {
      const records = await db.table(table).where(rule.condition);
      
      if (rule.action === 'delete') {
        await db.table(table).where(rule.condition).del();
      } else if (rule.action === 'archive') {
        await this.archiveRecords(table, records);
        await db.table(table).where(rule.condition).del();
      }
      
      totalProcessed += records.length;
    }
    
    return {
      ruleName: rule.name,
      recordsProcessed: totalProcessed,
      executionTime: new Date()
    };
  }
}
```

## Performance Testing Data

### Large Dataset Generation
```typescript
// Performance test data generation
export class PerformanceTestData {
  async generateLoadTestData(): Promise<LoadTestDataSet> {
    console.log('Generating performance test data...');
    
    // Generate 100 tenants
    const tenants = await this.generateTenants(100);
    
    // Generate 10,000 users across tenants
    const users = await this.generateUsers(10000, tenants);
    
    // Generate 100,000 documents
    const documents = await this.generateDocuments(100000, users);
    
    // Generate permission assignments
    const permissions = await this.generatePermissions(users);
    
    return {
      tenants,
      users,
      documents,
      permissions,
      generatedAt: new Date()
    };
  }
  
  private async generateTenants(count: number): Promise<Tenant[]> {
    const tenants: Tenant[] = [];
    
    for (let i = 0; i < count; i++) {
      tenants.push(TestDataFactory.createTenant({
        name: `Load Test Tenant ${i + 1}`,
        subdomain: `loadtest${i + 1}`
      }));
      
      // Progress reporting
      if (i % 10 === 0) {
        console.log(`Generated ${i + 1}/${count} tenants`);
      }
    }
    
    return tenants;
  }
  
  private async generateUsers(count: number, tenants: Tenant[]): Promise<User[]> {
    const users: User[] = [];
    
    for (let i = 0; i < count; i++) {
      const tenant = faker.helpers.arrayElement(tenants);
      users.push(TestDataFactory.createUser({
        email: `loadtest${i + 1}@${tenant.subdomain}.test`,
        tenantId: tenant.id
      }));
      
      if (i % 100 === 0) {
        console.log(`Generated ${i + 1}/${count} users`);
      }
    }
    
    return users;
  }
}
```

## Related Documentation

- **[LOAD_TESTING_SCENARIOS.md](LOAD_TESTING_SCENARIOS.md)**: Load testing scenarios
- **[CONTINUOUS_TESTING_PIPELINE.md](CONTINUOUS_TESTING_PIPELINE.md)**: CI/CD testing integration
- **[../TEST_FRAMEWORK.md](../TEST_FRAMEWORK.md)**: Overall testing framework

## Version History

- **1.0.0**: Initial comprehensive test data management strategy (2025-05-23)
