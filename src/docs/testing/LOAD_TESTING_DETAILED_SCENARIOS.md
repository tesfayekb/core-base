
# Detailed Load Testing Scenarios

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides comprehensive, detailed load testing scenarios with specific implementation details, tools, and metrics for validating system performance under various load conditions.

## Industry-Specific Load Testing Scenarios

### Financial Services Scenarios

#### Transaction Processing Load Testing
**Scenario**: High-volume financial transaction processing
- **Users**: Ramp from 100 to 1000 concurrent users over 30 minutes
- **Operations**: 
  - 60% read transactions (account balance, history)
  - 30% write transactions (transfers, payments)
  - 10% analytical operations (reporting)
- **Transaction Rate**: Target 500 financial transactions per second
- **Data Volume**: 10 million account records, 100 million transaction history records
- **Success Criteria**: 
  - 99.99% transaction success rate
  - Average response time < 300ms
  - P95 response time < 800ms
  - No deadlocks or data inconsistency

**Implementation Script**:
```javascript
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const transactionDuration = new Trend('transaction_duration');

export const options = {
  scenarios: {
    financial_transactions: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        { duration: '10m', target: 300 },
        { duration: '10m', target: 600 },
        { duration: '10m', target: 1000 },
        { duration: '5m', target: 1000 },
        { duration: '5m', target: 0 }
      ],
      gracefulRampDown: '2m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1200'],
    'http_req_duration{transaction:balance}': ['p(95)<200'],
    'http_req_duration{transaction:transfer}': ['p(95)<500'],
    'errors': ['rate<0.01'],
    'transaction_duration': ['p(95)<800']
  },
};

const BASE_URL = 'https://api.example.com';
const TENANT_ID = 'financial-tenant-001';

export function setup() {
  // Create test accounts and initial data
  const setupResp = http.post(`${BASE_URL}/test/setup`, {
    accounts: 10000,
    tenant: TENANT_ID
  });
  
  return {
    accounts: setupResp.json().accounts,
    tenantId: TENANT_ID
  };
}

export default function(data) {
  const account = data.accounts[Math.floor(Math.random() * data.accounts.length)];
  
  group('Financial Transaction Flow', function() {
    // Authentication
    const authResp = http.post(`${BASE_URL}/auth/login`, {
      accountId: account.id,
      tenantId: data.tenantId
    }, {
      tags: { transaction: 'auth' }
    });
    
    check(authResp, {
      'authentication successful': (r) => r.status === 200,
      'auth token received': (r) => r.json().token !== undefined
    }) || errorRate.add(1);
    
    const token = authResp.json().token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': data.tenantId,
      'Content-Type': 'application/json'
    };
    
    // Balance Check (60% of operations)
    if (Math.random() < 0.6) {
      group('Account Balance Check', function() {
        const startTime = Date.now();
        
        const balanceResp = http.get(
          `${BASE_URL}/accounts/${account.id}/balance`,
          { headers, tags: { transaction: 'balance' } }
        );
        
        const duration = Date.now() - startTime;
        transactionDuration.add(duration);
        
        check(balanceResp, {
          'balance status is 200': (r) => r.status === 200,
          'balance response time < 200ms': (r) => r.timings.duration < 200,
          'balance contains amount': (r) => r.json().balance !== undefined
        }) || errorRate.add(1);
      });
    }
    
    // Transaction History (additional read operation)
    if (Math.random() < 0.4) {
      group('Transaction History', function() {
        const historyResp = http.get(
          `${BASE_URL}/accounts/${account.id}/transactions?limit=50`,
          { headers, tags: { transaction: 'history' } }
        );
        
        check(historyResp, {
          'history status is 200': (r) => r.status === 200,
          'history contains transactions': (r) => Array.isArray(r.json().transactions)
        }) || errorRate.add(1);
      });
    }
    
    // Money Transfer (30% of operations)
    if (Math.random() < 0.3) {
      group('Money Transfer', function() {
        const recipientAccount = data.accounts[Math.floor(Math.random() * data.accounts.length)];
        const transferAmount = Math.floor(Math.random() * 1000) + 1;
        
        const startTime = Date.now();
        
        const transferResp = http.post(`${BASE_URL}/transactions/transfer`, 
          JSON.stringify({
            fromAccount: account.id,
            toAccount: recipientAccount.id,
            amount: transferAmount,
            currency: 'USD',
            reference: `LOAD-TEST-${Date.now()}`,
            tenantId: data.tenantId
          }), 
          { headers, tags: { transaction: 'transfer' } }
        );
        
        const duration = Date.now() - startTime;
        transactionDuration.add(duration);
        
        check(transferResp, {
          'transfer status is 200': (r) => r.status === 200,
          'transfer contains confirmation': (r) => r.json().confirmationId !== undefined,
          'transfer response time < 500ms': (r) => r.timings.duration < 500
        }) || errorRate.add(1);
        
        // Verify transfer completion
        if (transferResp.status === 200) {
          sleep(0.5); // Brief pause for transaction processing
          
          const confirmationResp = http.get(
            `${BASE_URL}/transactions/${transferResp.json().confirmationId}`,
            { headers, tags: { transaction: 'confirmation' } }
          );
          
          check(confirmationResp, {
            'confirmation status is 200': (r) => r.status === 200,
            'transfer confirmed': (r) => r.json().status === 'completed'
          }) || errorRate.add(1);
        }
      });
    }
    
    // Reporting Operations (10% of operations)
    if (Math.random() < 0.1) {
      group('Account Reporting', function() {
        const reportResp = http.get(
          `${BASE_URL}/accounts/${account.id}/report?period=30days`,
          { headers, tags: { transaction: 'report' } }
        );
        
        check(reportResp, {
          'report status is 200': (r) => r.status === 200,
          'report contains data': (r) => r.json().summary !== undefined
        }) || errorRate.add(1);
      });
    }
  });
  
  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

export function teardown(data) {
  // Cleanup test data
  http.post(`${BASE_URL}/test/cleanup`, {
    tenantId: data.tenantId
  });
}
```

#### Month-End Financial Reporting
**Scenario**: Heavy reporting and batch processing at month-end
- **Users**: 200 concurrent users generating reports
- **Background**: Batch processing of month-end reconciliation
- **Operations**:
  - Large dataset aggregation (millions of transactions)
  - Complex financial calculations
  - PDF report generation
  - Data export to external systems
- **Duration**: 8 hours (typical month-end processing window)
- **Success Criteria**:
  - All reports complete within 8-hour window
  - Database CPU < 85% sustained
  - Report generation < 2 minutes per report
  - Interactive user operations remain responsive (< 2s)

### Healthcare Scenarios

#### Patient Record Access Pattern
**Scenario**: Hospital shift change with spike in patient record access
- **Pattern**: 
  - Baseline: 100 concurrent users
  - Shift change: Spike to 500 concurrent users within 15 minutes
  - Duration: 2 hours (covering complete shift transition)
- **Operations**:
  - Patient record retrieval (with medical images)
  - Medication administration recording
  - Clinical notes entry
  - Lab result viewing
- **Data Sensitivity**: Enforce HIPAA-compliant data access
- **Success Criteria**:
  - Patient record retrieval < 1 second
  - No data leakage between patient contexts
  - System maintains HIPAA audit logging under load
  - Zero errors in medication administration workflow

**Gatling Implementation**:
```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class HealthcareShiftChangeSimulation extends Simulation {
  
  val httpProtocol = http
    .baseUrl("https://hospital-api.example.com")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .header("X-HIPAA-Compliance", "enabled")
  
  val patientIds = csv("patients.csv").random
  val nurseCredentials = csv("nurses.csv").circular
  
  val baselineOperations = scenario("Baseline Hospital Operations")
    .feed(nurseCredentials)
    .feed(patientIds)
    .exec(
      http("Nurse Login")
        .post("/api/auth/login")
        .body(StringBody("""{"username":"${username}","password":"${password}","role":"nurse"}"""))
        .check(status.is(200))
        .check(jsonPath("$.token").saveAs("authToken"))
        .check(jsonPath("$.permissions").saveAs("permissions"))
    )
    .pause(1, 3)
    .exec(
      http("Get Patient Summary")
        .get("/api/patients/${patientId}/summary")
        .header("Authorization", "Bearer ${authToken}")
        .check(status.is(200))
        .check(responseTimeInMillis.lt(1000))
        .check(jsonPath("$.patientId").is("${patientId}"))
    )
    .pause(2, 5)
    .exec(
      http("Get Patient Medications")
        .get("/api/patients/${patientId}/medications")
        .header("Authorization", "Bearer ${authToken}")
        .check(status.is(200))
        .check(jsonPath("$.medications").exists)
    )
    .pause(1, 2)
    .exec(
      http("Record Vital Signs")
        .post("/api/patients/${patientId}/vitals")
        .header("Authorization", "Bearer ${authToken}")
        .body(StringBody("""{"temperature":98.6,"bloodPressure":"120/80","heartRate":72,"timestamp":"${__time()}"}"""))
        .check(status.is(201))
    )

  val shiftChangeOperations = scenario("Shift Change Operations")
    .feed(nurseCredentials)
    .feed(patientIds)
    .exec(
      http("Shift Login")
        .post("/api/auth/login")
        .body(StringBody("""{"username":"${username}","password":"${password}","shift":"night"}"""))
        .check(status.is(200))
        .check(jsonPath("$.token").saveAs("authToken"))
    )
    .pause(1)
    .exec(
      http("Get Shift Handover")
        .get("/api/shift/handover")
        .header("Authorization", "Bearer ${authToken}")
        .check(status.is(200))
        .check(jsonPath("$.patients").exists)
    )
    .repeat(3) {
      feed(patientIds)
        .exec(
          http("Quick Patient Check")
            .get("/api/patients/${patientId}/current-status")
            .header("Authorization", "Bearer ${authToken}")
            .check(status.is(200))
            .check(responseTimeInMillis.lt(500))
        )
        .pause(1)
    }
    .exec(
      http("Complete Handover")
        .post("/api/shift/handover/complete")
        .header("Authorization", "Bearer ${authToken}")
        .body(StringBody("""{"shiftId":"${shiftId}","status":"completed","notes":"Handover completed successfully"}"""))
        .check(status.is(200))
    )

  setUp(
    baselineOperations.inject(
      constantUsersPerSec(2) during(15.minutes)
    ),
    shiftChangeOperations.inject(
      nothingFor(15.minutes),
      rampUsers(400) during(15.minutes),
      constantUsers(400) during(30.minutes),
      rampUsers(100) during(30.minutes),
      constantUsers(100) during(30.minutes)
    )
  ).protocols(httpProtocol)
    .assertions(
      global.responseTime.p95.lt(2000),
      global.successfulRequests.percent.gt(99.5),
      forAll.responseTime.p99.lt(5000)
    )
}
```

### E-Commerce Scenarios

#### Flash Sale Event
**Scenario**: Limited-time high-demand product sale
- **Traffic Pattern**:
  - Normal: 1,000 concurrent users
  - Pre-sale announcement: Spike to 10,000 users within 5 minutes
  - Sale start: Spike to 50,000 users within 2 minutes
  - Duration: 4 hours total
- **Operations**:
  - Product page views (high cache hit ratio required)
  - Inventory checks (real-time accuracy required)
  - Add to cart operations (high concurrency)
  - Checkout process (payment processing load)
- **Inventory Constraint**: 5,000 units of limited product
- **Success Criteria**:
  - Zero overselling of inventory
  - Checkout completion rate > 98%
  - Page load times < 2 seconds
  - Payment processing < 5 seconds
  - Cart abandonment < 25%

**Artillery Implementation**:
```yaml
# Flash Sale Load Test Configuration
config:
  target: 'https://ecommerce-api.example.com'
  phases:
    - duration: 300  # 5 minutes pre-sale
      arrivalRate: 100
      name: "Pre-sale browsing"
    - duration: 120  # 2 minutes sale start
      arrivalRate: 2500
      name: "Flash sale start"
    - duration: 3600 # 1 hour sustained
      arrivalRate: 1000
      name: "Sustained flash sale"
    - duration: 7200 # 2 hours wind down
      arrivalRate: 200
      name: "Post-sale activity"
  payload:
    path: "flash-sale-users.csv"
    fields:
      - "userId"
      - "sessionId"
      - "location"
  plugins:
    metrics-by-endpoint:
      useOnlyRequestNames: true

scenarios:
  - name: "Flash Sale User Journey"
    weight: 100
    engine: http
    flow:
      # Pre-sale browsing
      - get:
          url: "/products/flash-sale-item"
          capture:
            - json: "$.productId"
              as: "productId"
            - json: "$.price"
              as: "originalPrice"
          expect:
            - statusCode: 200
            - contentType: json
            - hasProperty: "inventory.available"

      # Check inventory availability
      - get:
          url: "/products/{{ productId }}/inventory"
          expect:
            - statusCode: 200
            - property: "available"
              gt: 0

      # Add to cart (high concurrency operation)
      - post:
          url: "/cart/add"
          json:
            productId: "{{ productId }}"
            quantity: 1
            userId: "{{ userId }}"
            sessionId: "{{ sessionId }}"
          capture:
            - json: "$.cartId"
              as: "cartId"
          expect:
            - statusCode: 201
            - property: "success"
              equals: true

      # Brief pause for user decision
      - think: 2

      # Proceed to checkout (30% conversion rate)
      - ifTrue: "Math.random() < 0.3"
        then:
          - get:
              url: "/cart/{{ cartId }}"
              expect:
                - statusCode: 200
                
          - post:
              url: "/checkout/initiate"
              json:
                cartId: "{{ cartId }}"
                userId: "{{ userId }}"
              capture:
                - json: "$.checkoutId"
                  as: "checkoutId"
              expect:
                - statusCode: 200
                
          # Payment processing
          - post:
              url: "/checkout/{{ checkoutId }}/payment"
              json:
                method: "credit_card"
                cardToken: "test_card_token"
                amount: "{{ originalPrice }}"
              expect:
                - statusCode: 200
                - responseTime: 5000
                
          # Order confirmation
          - post:
              url: "/checkout/{{ checkoutId }}/complete"
              expect:
                - statusCode: 201
                - property: "orderConfirmed"
                  equals: true

      # Inventory verification checkpoint
      - get:
          url: "/products/{{ productId }}/inventory"
          expect:
            - statusCode: 200

  # Inventory monitoring scenario
  - name: "Inventory Monitoring"
    weight: 5
    engine: http
    flow:
      - loop:
          count: 1000
          over:
            - get:
                url: "/admin/inventory/flash-sale-item/status"
                headers:
                  Authorization: "Bearer {{ adminToken }}"
                expect:
                  - statusCode: 200
                  - property: "oversold"
                    equals: false
            - think: 5

# Custom functions for validation
functions:
  validateInventory: |
    function(requestParams, response, context, ee, next) {
      const inventory = response.body.inventory;
      if (inventory.sold > inventory.total) {
        ee.emit('counter', 'inventory.oversold', 1);
      }
      return next();
    }
```

## Enterprise System Scenarios

### Multi-Tenant Resource Contention

#### Noisy Neighbor Simulation
**Scenario**: Test tenant isolation under resource contention
- **Setup**:
  - 50 standard tenants with normal workload
  - 1 "noisy" tenant with extreme resource usage
  - Duration: 4 hours of sustained load
- **Noisy Tenant Pattern**:
  - Complex queries with large result sets
  - Frequent full-text searches
  - Large batch operations
  - Frequent cache invalidation
- **Metrics to Monitor**:
  - Cross-tenant response time impact
  - Database CPU and I/O allocation
  - Cache hit rates per tenant
  - Resource governor effectiveness
- **Success Criteria**:
  - Standard tenant performance impact < 10%
  - Noisy tenant properly throttled
  - No cross-tenant data leakage
  - System stability maintained

**Node.js Monitoring Implementation**:
```typescript
import { performance } from 'perf_hooks';
import axios from 'axios';

interface TenantMetrics {
  tenantId: string;
  responseTimeP95: number;
  databaseCpuUsage: number;
  queriesPerSecond: number;
  cacheHitRatio: number;
  errorRate: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    diskIO: number;
  };
}

class MultiTenantLoadTester {
  private baselineMetrics: Map<string, TenantMetrics> = new Map();
  private currentMetrics: Map<string, TenantMetrics> = new Map();
  private testStartTime: number = 0;
  
  async runNoisyNeighborTest(): Promise<void> {
    this.testStartTime = performance.now();
    
    // Start baseline monitoring
    const standardTenants = this.generateStandardTenantIds(50);
    const noisyTenant = 'noisy-tenant-001';
    
    // Capture baseline metrics
    await this.captureBaseline([...standardTenants, noisyTenant]);
    
    // Start concurrent load
    const standardTenantPromises = standardTenants.map(tenantId => 
      this.runStandardTenantLoad(tenantId)
    );
    
    const noisyTenantPromise = this.runNoisyTenantLoad(noisyTenant);
    
    // Monitor performance during test
    const monitoringPromise = this.monitorTenantPerformance([...standardTenants, noisyTenant]);
    
    // Wait for test completion
    await Promise.all([
      ...standardTenantPromises,
      noisyTenantPromise,
      monitoringPromise
    ]);
    
    // Generate final report
    await this.generatePerformanceReport();
  }
  
  private async runStandardTenantLoad(tenantId: string): Promise<void> {
    const duration = 4 * 60 * 60 * 1000; // 4 hours
    const endTime = Date.now() + duration;
    
    while (Date.now() < endTime) {
      // Standard CRUD operations
      await this.performStandardOperations(tenantId);
      
      // Brief pause between operations
      await this.sleep(100 + Math.random() * 200); // 100-300ms
    }
  }
  
  private async runNoisyTenantLoad(tenantId: string): Promise<void> {
    const duration = 4 * 60 * 60 * 1000; // 4 hours
    const endTime = Date.now() + duration;
    
    while (Date.now() < endTime) {
      // Resource-intensive operations
      const operations = [
        () => this.performComplexQuery(tenantId),
        () => this.performFullTextSearch(tenantId),
        () => this.performBatchOperation(tenantId),
        () => this.invalidateCache(tenantId)
      ];
      
      // Execute multiple operations concurrently
      await Promise.all(operations.map(op => op()));
      
      // Minimal pause for maximum resource usage
      await this.sleep(50);
    }
  }
  
  private async performStandardOperations(tenantId: string): Promise<void> {
    const operations = [
      // Read operations (70%)
      ...(Array(7).fill(0).map(() => () => this.performRead(tenantId))),
      
      // Write operations (20%)
      ...(Array(2).fill(0).map(() => () => this.performWrite(tenantId))),
      
      // Admin operations (10%)
      () => this.performAdminOperation(tenantId)
    ];
    
    const selectedOperation = operations[Math.floor(Math.random() * operations.length)];
    await selectedOperation();
  }
  
  private async performComplexQuery(tenantId: string): Promise<void> {
    const startTime = performance.now();
    
    try {
      await axios.post('/api/analytics/complex-report', {
        tenantId,
        reportType: 'comprehensive',
        dateRange: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days
          end: new Date()
        },
        includeSubTenants: true,
        aggregationLevel: 'detailed'
      }, {
        timeout: 60000, // 1 minute timeout
        headers: { 'X-Tenant-ID': tenantId }
      });
    } catch (error) {
      console.error(`Complex query failed for tenant ${tenantId}:`, error.message);
    }
    
    const duration = performance.now() - startTime;
    await this.recordMetric(tenantId, 'complexQuery', duration);
  }
  
  private async performBatchOperation(tenantId: string): Promise<void> {
    const batchSize = 10000; // Large batch
    const startTime = performance.now();
    
    try {
      await axios.post('/api/data/batch-process', {
        tenantId,
        operations: Array(batchSize).fill(0).map((_, index) => ({
          type: 'update',
          entityId: `entity-${index}`,
          data: { updated: new Date(), batchId: startTime }
        }))
      }, {
        timeout: 120000, // 2 minute timeout
        headers: { 'X-Tenant-ID': tenantId }
      });
    } catch (error) {
      console.error(`Batch operation failed for tenant ${tenantId}:`, error.message);
    }
    
    const duration = performance.now() - startTime;
    await this.recordMetric(tenantId, 'batchOperation', duration);
  }
  
  private async monitorTenantPerformance(tenantIds: string[]): Promise<void> {
    const monitoringInterval = 30000; // 30 seconds
    
    while (true) {
      for (const tenantId of tenantIds) {
        const metrics = await this.collectCurrentMetrics(tenantId);
        this.currentMetrics.set(tenantId, metrics);
        
        await this.analyzePerformanceImpact(tenantId);
      }
      
      await this.sleep(monitoringInterval);
    }
  }
  
  private async analyzePerformanceImpact(tenantId: string): Promise<void> {
    const baseline = this.baselineMetrics.get(tenantId);
    const current = this.currentMetrics.get(tenantId);
    
    if (!baseline || !current) return;
    
    const responseTimeImpact = (current.responseTimeP95 / baseline.responseTimeP95 - 1) * 100;
    const cpuImpact = (current.databaseCpuUsage / baseline.databaseCpuUsage - 1) * 100;
    const cacheImpact = (baseline.cacheHitRatio / current.cacheHitRatio - 1) * 100;
    
    if (responseTimeImpact > 10) {
      console.warn(`⚠️  Tenant ${tenantId} experiencing ${responseTimeImpact.toFixed(2)}% response time degradation`);
      
      // Check if this is due to noisy neighbor
      if (tenantId !== 'noisy-tenant-001') {
        await this.alertNoisyNeighborImpact(tenantId, {
          responseTimeImpact,
          cpuImpact,
          cacheImpact
        });
      }
    }
    
    // Record metrics for final analysis
    await this.recordPerformanceMetrics(tenantId, {
      responseTimeImpact,
      cpuImpact,
      cacheImpact,
      timestamp: Date.now()
    });
  }
  
  private async collectCurrentMetrics(tenantId: string): Promise<TenantMetrics> {
    try {
      const response = await axios.get(`/api/monitoring/tenant/${tenantId}/metrics`, {
        headers: { 'Authorization': 'Bearer admin-token' }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Failed to collect metrics for tenant ${tenantId}:`, error.message);
      
      // Return default metrics on error
      return {
        tenantId,
        responseTimeP95: 0,
        databaseCpuUsage: 0,
        queriesPerSecond: 0,
        cacheHitRatio: 0,
        errorRate: 100,
        resourceUsage: { cpu: 0, memory: 0, diskIO: 0 }
      };
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const tester = new MultiTenantLoadTester();
tester.runNoisyNeighborTest().then(() => {
  console.log('Noisy neighbor load test completed');
}).catch(error => {
  console.error('Load test failed:', error);
});
```

## Mobile-Specific Load Testing

### Connectivity Pattern Simulation

#### Network Transition Load Testing
**Scenario**: Users moving between connectivity states
- **Setup**:
  - 10,000 mobile users
  - Connection types: 5G, 4G, 3G, WiFi, Offline
- **Transition Pattern**:
  - 30% of users change connection type every 5 minutes
  - 10% of users go completely offline
  - 5% of users experience intermittent connectivity
- **Operations**:
  - Data synchronization during transitions
  - Offline operation queuing
  - Conflict resolution on reconnection
- **Success Criteria**:
  - Seamless transition between connection states
  - No data loss during disconnection
  - Proper conflict resolution on reconnection
  - Battery efficiency maintained

**Playwright Mobile Simulation**:
```typescript
import { test, expect, devices } from '@playwright/test';

class MobileConnectivityTester {
  private page: any;
  private context: any;
  
  async simulateNetworkTransitions() {
    // Simulate different mobile devices
    const mobileDevices = [
      devices['iPhone 13'],
      devices['Pixel 5'],
      devices['Galaxy S21']
    ];
    
    for (const device of mobileDevices) {
      await this.testDeviceConnectivity(device);
    }
  }
  
  async testDeviceConnectivity(device: any) {
    this.context = await browser.newContext({
      ...device,
      permissions: ['geolocation']
    });
    
    this.page = await this.context.newPage();
    
    // Test network transition scenarios
    await this.test5GTo4GTransition();
    await this.testWiFiToOfflineTransition();
    await this.testIntermittentConnectivity();
    
    await this.context.close();
  }
  
  async test5GTo4GTransition() {
    // Start with 5G connection
    await this.page.route('**/*', route => {
      // Simulate 5G speed (1 Gbps)
      setTimeout(() => route.continue(), 10);
    });
    
    await this.page.goto('/mobile-app');
    
    // Perform data-intensive operation
    await this.page.click('[data-testid="sync-data"]');
    
    // Switch to 4G during operation
    await this.page.route('**/*', route => {
      // Simulate 4G speed (100 Mbps)
      setTimeout(() => route.continue(), 50);
    });
    
    // Verify smooth transition
    await expect(this.page.locator('[data-testid="sync-status"]')).toContainText('Syncing');
    
    // Wait for completion
    await expect(this.page.locator('[data-testid="sync-status"]')).toContainText('Completed', {
      timeout: 30000
    });
  }
  
  async testWiFiToOfflineTransition() {
    // Start with WiFi
    await this.page.goto('/mobile-app');
    
    // Load some data
    await this.page.click('[data-testid="load-documents"]');
    await this.page.waitForSelector('[data-testid="document-list"]');
    
    // Go offline
    await this.context.setOffline(true);
    
    // Try to create new document offline
    await this.page.click('[data-testid="create-document"]');
    await this.page.fill('[data-testid="document-title"]', 'Offline Document');
    await this.page.click('[data-testid="save-document"]');
    
    // Verify offline indicator
    await expect(this.page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Verify document queued for sync
    await expect(this.page.locator('[data-testid="pending-sync"]')).toContainText('1 item');
    
    // Go back online
    await this.context.setOffline(false);
    
    // Verify auto-sync
    await expect(this.page.locator('[data-testid="sync-status"]')).toContainText('Syncing');
    await expect(this.page.locator('[data-testid="pending-sync"]')).toContainText('0 items', {
      timeout: 15000
    });
  }
  
  async testIntermittentConnectivity() {
    await this.page.goto('/mobile-app');
    
    // Simulate intermittent connectivity
    let isOnline = true;
    const toggleConnection = setInterval(async () => {
      isOnline = !isOnline;
      await this.context.setOffline(!isOnline);
    }, 2000); // Toggle every 2 seconds
    
    // Perform operations during intermittent connectivity
    for (let i = 0; i < 10; i++) {
      await this.page.click('[data-testid="refresh-data"]');
      await this.page.waitForTimeout(1000);
    }
    
    clearInterval(toggleConnection);
    
    // Ensure stable connection
    await this.context.setOffline(false);
    
    // Verify data integrity
    await expect(this.page.locator('[data-testid="error-count"]')).toContainText('0');
  }
}
```

## Load Testing Automation and CI/CD Integration

### Automated Load Testing Pipeline

```yaml
# GitHub Actions Load Testing Workflow
name: Load Testing Pipeline

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:
    inputs:
      test_type:
        description: 'Type of load test to run'
        required: true
        default: 'standard'
        type: choice
        options:
          - standard
          - peak
          - stress
          - endurance
          - multi-tenant
      duration:
        description: 'Test duration in minutes'
        required: true
        default: '30'

jobs:
  load-test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        test-scenario:
          - financial-transactions
          - healthcare-shift-change
          - ecommerce-flash-sale
          - multi-tenant-isolation
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          npm install -g k6
          npm install -g artillery
          npm install
          
      - name: Setup test environment
        run: |
          docker-compose -f docker-compose.test.yml up -d
          ./scripts/wait-for-services.sh
          
      - name: Prepare test data
        run: |
          npm run test:data:setup
          
      - name: Run load test
        env:
          TEST_TYPE: ${{ github.event.inputs.test_type || 'standard' }}
          DURATION: ${{ github.event.inputs.duration || '30' }}
          TARGET_URL: ${{ secrets.LOAD_TEST_TARGET_URL }}
        run: |
          case "${{ matrix.test-scenario }}" in
            "financial-transactions")
              k6 run --duration ${DURATION}m tests/load/financial-transactions.js
              ;;
            "healthcare-shift-change")
              artillery run tests/load/healthcare-shift-change.yml
              ;;
            "ecommerce-flash-sale")
              artillery run tests/load/ecommerce-flash-sale.yml
              ;;
            "multi-tenant-isolation")
              node tests/load/multi-tenant-isolation.js
              ;;
          esac
          
      - name: Collect performance metrics
        run: |
          ./scripts/collect-metrics.sh
          
      - name: Generate load test report
        run: |
          npm run test:report:generate
          
      - name: Upload test results
        uses: actions/upload-artifact@v4
        with:
          name: load-test-results-${{ matrix.test-scenario }}
          path: |
            test-results/
            performance-reports/
            
      - name: Performance regression check
        run: |
          npm run test:regression:check
          
      - name: Cleanup test environment
        if: always()
        run: |
          docker-compose -f docker-compose.test.yml down
          npm run test:data:cleanup
```

## Related Documentation

- **[LOAD_TESTING_SCENARIOS.md](LOAD_TESTING_SCENARIOS.md)**: Base load testing scenarios
- **[PERFORMANCE_TESTING.md](PERFORMANCE_TESTING.md)**: Performance testing approach
- **[../PERFORMANCE_STANDARDS.md](../PERFORMANCE_STANDARDS.md)**: Performance standards and benchmarks
- **[SECURITY_TESTING.md](SECURITY_TESTING.md)**: Security aspects of load testing
- **[../mobile/TESTING.md](../mobile/TESTING.md)**: Mobile-specific testing strategy

## Version History

- **2.0.0**: Enhanced with comprehensive detailed scenarios, specific implementation code, and automation examples (2025-05-23)
- **1.0.0**: Initial detailed load testing scenarios document (2025-05-23)
