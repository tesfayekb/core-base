
// Performance Integration Test Suite
// Integrates all performance validation components

import { ProductionReadinessValidator } from './ProductionReadinessValidator';
import { RealWorldPerformanceValidator } from './RealWorldPerformanceValidator';

describe('Performance Integration Tests', () => {
  describe('Production Readiness Validation', () => {
    test('should validate complete production readiness', async () => {
      const validator = new ProductionReadinessValidator();
      const readinessReport = await validator.validateProductionReadiness();

      console.log('\n🎯 Production Readiness Report:');
      console.log(`Overall Readiness: ${readinessReport.overallReadiness}%`);
      
      readinessReport.categories.forEach(category => {
        const status = category.passed ? '✅' : '❌';
        console.log(`${status} ${category.category}: ${category.score}%`);
        category.details.forEach(detail => console.log(`  - ${detail}`));
      });

      if (readinessReport.blockers.length > 0) {
        console.log('\n🚫 Production Blockers:');
        readinessReport.blockers.forEach(blocker => console.log(`  - ${blocker}`));
      }

      console.log('\n💡 Recommendations:');
      readinessReport.recommendations.forEach(rec => console.log(`  - ${rec}`));

      // System should be at least 75% ready for production
      expect(readinessReport.overallReadiness).toBeGreaterThanOrEqual(75);

      // No critical blockers should exist
      const criticalBlockers = readinessReport.blockers.filter(b => 
        b.includes('Permission') || b.includes('Database') || b.includes('Critical')
      );
      expect(criticalBlockers.length).toBe(0);

    }, 120000); // 2 minute timeout for comprehensive testing

    test('should demonstrate real-world performance meets production standards', async () => {
      const validator = new RealWorldPerformanceValidator();
      const performanceReport = await validator.validateRealWorldPerformance();

      console.log('\n📊 Real-World Performance Validation:');
      
      // Critical performance requirements for production
      const criticalTests = [
        { name: 'Real Permission Check', maxTime: 15 },
        { name: 'Real Database Connection', maxTime: 100 },
        { name: 'Real Audit Logging', maxTime: 5 }
      ];

      criticalTests.forEach(criticalTest => {
        const result = performanceReport.results.find(r => 
          r.testName.includes(criticalTest.name)
        );
        
        expect(result).toBeDefined();
        expect(result!.duration).toBeLessThanOrEqual(criticalTest.maxTime);
        
        console.log(`✅ ${criticalTest.name}: ${result!.duration}ms ≤ ${criticalTest.maxTime}ms`);
      });

      // Overall performance score should be production-ready
      expect(performanceReport.overallScore).toBeGreaterThanOrEqual(90);

    }, 60000); // 1 minute timeout
  });
});
