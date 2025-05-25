
// Load Testing with Real Database Integration
// Tests system performance under realistic load with actual database operations

import { RealWorldPerformanceValidator } from './RealWorldPerformanceValidator';
import { rbacService } from '../../services/rbac/rbacService';
import { supabase } from '../../services/database/connection';

describe('Load Testing with Real Database', () => {
  let performanceValidator: RealWorldPerformanceValidator;

  beforeAll(() => {
    performanceValidator = new RealWorldPerformanceValidator();
  });

  describe('Real-World Performance Validation', () => {
    test('should validate all performance targets with real database calls', async () => {
      const report = await performanceValidator.validateRealWorldPerformance();

      console.log('📊 Performance Validation Report:');
      console.log(`Overall Score: ${report.overallScore}%`);
      console.log(`Targets Met: ${report.targetsMet}/${report.totalTests}`);
      
      report.results.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${result.testName}: ${result.duration}ms (target: ${result.target}ms)`);
      });

      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`- ${rec}`));

      // Expect at least 80% of performance targets to be met
      expect(report.overallScore).toBeGreaterThanOrEqual(80);
      
      // Critical performance checks must pass
      const criticalTests = report.results.filter(r => 
        r.testName.includes('Permission Check') || 
        r.testName.includes('Database Connection')
      );
      
      criticalTests.forEach(test => {
        expect(test.passed).toBe(true);
      });
    }, 30000); // 30 second timeout for real database operations

    test('should handle sustained load with real database operations', async () => {
      const sustainedLoadDuration = 60000; // 1 minute
      const operationsPerSecond = 10;
      const startTime = Date.now();
      const results: number[] = [];

      console.log('🔄 Starting sustained load test with real database operations...');

      while (Date.now() - startTime < sustainedLoadDuration) {
        const operationStart = performance.now();
        
        try {
          // Perform real database operation
          await rbacService.checkPermission(
            'load-test-user',
            'read',
            'documents',
            { tenantId: 'load-test-tenant' }
          );
          
          const operationEnd = performance.now();
          results.push(operationEnd - operationStart);
          
          // Maintain target operations per second
          const nextOperationDelay = Math.max(0, (1000 / operationsPerSecond) - (operationEnd - operationStart));
          if (nextOperationDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, nextOperationDelay));
          }
        } catch (error) {
          console.error('Operation failed during sustained load:', error);
        }
      }

      const averageResponseTime = results.reduce((a, b) => a + b, 0) / results.length;
      const maxResponseTime = Math.max(...results);
      const minResponseTime = Math.min(...results);

      console.log(`📈 Sustained Load Results:`);
      console.log(`- Total Operations: ${results.length}`);
      console.log(`- Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`- Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
      console.log(`- Min Response Time: ${minResponseTime.toFixed(2)}ms`);

      // Performance expectations for sustained load
      expect(averageResponseTime).toBeLessThan(50); // Average under 50ms
      expect(maxResponseTime).toBeLessThan(200); // Max under 200ms
      expect(results.length).toBeGreaterThan(500); // At least 500 operations completed
    }, 70000); // 70 second timeout

    test('should maintain performance under concurrent real database load', async () => {
      const concurrentUsers = 20;
      const operationsPerUser = 25;
      
      console.log(`👥 Testing ${concurrentUsers} concurrent users with real database operations...`);

      const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
        const userResults: number[] = [];
        
        for (let i = 0; i < operationsPerUser; i++) {
          const start = performance.now();
          
          try {
            await rbacService.checkPermission(
              `concurrent-user-${userIndex}`,
              'read',
              'documents',
              { tenantId: `tenant-${userIndex % 5}` } // Distribute across 5 tenants
            );
            
            userResults.push(performance.now() - start);
          } catch (error) {
            console.error(`User ${userIndex} operation ${i} failed:`, error);
          }
        }
        
        return userResults;
      });

      const allUserResults = await Promise.all(userPromises);
      const allResults = allUserResults.flat();
      
      const averageResponseTime = allResults.reduce((a, b) => a + b, 0) / allResults.length;
      const p95ResponseTime = allResults.sort((a, b) => a - b)[Math.floor(allResults.length * 0.95)];

      console.log(`🎯 Concurrent Load Results:`);
      console.log(`- Total Operations: ${allResults.length}`);
      console.log(`- Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`- 95th Percentile: ${p95ResponseTime.toFixed(2)}ms`);

      // Performance expectations for concurrent load
      expect(averageResponseTime).toBeLessThan(30); // Average under 30ms
      expect(p95ResponseTime).toBeLessThan(100); // 95th percentile under 100ms
      expect(allResults.length).toBe(concurrentUsers * operationsPerUser); // All operations completed
    }, 60000); // 60 second timeout
  });

  describe('Database-Specific Performance Tests', () => {
    test('should validate database query performance with real data', async () => {
      const queries = [
        {
          name: 'Simple tenant query',
          query: () => supabase.from('tenants').select('id, name').limit(10),
          target: 10 // 10ms
        },
        {
          name: 'User permissions query',
          query: () => supabase.from('user_permissions').select('*').limit(5),
          target: 15 // 15ms
        },
        {
          name: 'Complex join query',
          query: () => supabase
            .from('users')
            .select('id, email, user_roles(role_id)')
            .limit(5),
          target: 25 // 25ms
        }
      ];

      for (const queryTest of queries) {
        const start = performance.now();
        
        try {
          const { data, error } = await queryTest.query();
          const duration = performance.now() - start;
          
          expect(error).toBeNull();
          expect(duration).toBeLessThan(queryTest.target);
          
          console.log(`✅ ${queryTest.name}: ${duration.toFixed(2)}ms (target: ${queryTest.target}ms)`);
        } catch (error) {
          console.error(`❌ ${queryTest.name} failed:`, error);
          throw error;
        }
      }
    });

    test('should validate audit logging performance under load', async () => {
      const auditOperations = 50;
      const results: number[] = [];

      console.log(`📝 Testing audit logging performance with ${auditOperations} operations...`);

      for (let i = 0; i < auditOperations; i++) {
        const start = performance.now();
        
        try {
          await supabase.rpc('log_audit_event', {
            p_event_type: 'USER_ACTION',
            p_action: 'load_test_audit',
            p_resource_type: 'test',
            p_details: { iteration: i, timestamp: Date.now() }
          });
          
          results.push(performance.now() - start);
        } catch (error) {
          console.error(`Audit operation ${i} failed:`, error);
        }
      }

      const averageAuditTime = results.reduce((a, b) => a + b, 0) / results.length;
      const maxAuditTime = Math.max(...results);

      console.log(`📋 Audit Performance Results:`);
      console.log(`- Average Time: ${averageAuditTime.toFixed(2)}ms`);
      console.log(`- Max Time: ${maxAuditTime.toFixed(2)}ms`);

      expect(averageAuditTime).toBeLessThan(10); // Average under 10ms
      expect(maxAuditTime).toBeLessThan(50); // Max under 50ms
      expect(results.length).toBe(auditOperations); // All operations completed
    });
  });
});
