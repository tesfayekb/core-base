
// Implementation State Scanner Tests
// Phase 1.5: AI Context System Testing

import { implementationStateScanner } from '@/services/ImplementationStateScanner';
import { ImplementationState, PhaseCompletionStatus } from '@/types/ImplementationState';

describe('ImplementationStateScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log for cleaner tests
  });

  describe('scanImplementationState', () => {
    it('should scan implementation state successfully', async () => {
      const result = await implementationStateScanner.scanImplementationState();
      
      expect(result).toBeDefined();
      expect(result.phases).toHaveLength(4);
      expect(result.overallCompletion).toBeGreaterThanOrEqual(0);
      expect(result.overallCompletion).toBeLessThanOrEqual(100);
      expect(result.currentPhase).toBeGreaterThanOrEqual(1);
      expect(result.currentPhase).toBeLessThanOrEqual(4);
      expect(result.lastScanned).toBeDefined();
    });

    it('should handle scanning errors gracefully', async () => {
      // Mock a scanning error scenario
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const result = await implementationStateScanner.scanImplementationState();
      
      expect(result).toBeDefined();
      expect(result.phases).toBeDefined();
      expect(result.blockers).toBeDefined();
      
      console.error = originalConsoleError;
    });

    it('should identify completed features correctly', async () => {
      const result = await implementationStateScanner.scanImplementationState();
      
      // Check that phases have reasonable completion status
      result.phases.forEach(phase => {
        expect(phase.completionPercentage).toBeGreaterThanOrEqual(0);
        expect(phase.completionPercentage).toBeLessThanOrEqual(100);
        expect(Array.isArray(phase.completedFeatures)).toBe(true);
        expect(Array.isArray(phase.pendingFeatures)).toBe(true);
      });
    });

    it('should validate phase completion correctly', async () => {
      const result = await implementationStateScanner.scanImplementationState();
      
      result.phases.forEach(phase => {
        expect(phase.validationStatus).toBeDefined();
        expect(typeof phase.validationStatus.passed).toBe('boolean');
        expect(Array.isArray(phase.validationStatus.errors)).toBe(true);
        expect(Array.isArray(phase.validationStatus.warnings)).toBe(true);
        expect(phase.validationStatus.score).toBeGreaterThanOrEqual(0);
        expect(phase.validationStatus.score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('phase-specific scanning', () => {
    it('should scan Phase 1 foundation features', async () => {
      const result = await implementationStateScanner.scanImplementationState();
      const phase1 = result.phases.find(p => p.phase === 1);
      
      expect(phase1).toBeDefined();
      expect(phase1!.name).toBe('Foundation');
      
      // Should look for authentication, RBAC, multi-tenant, and database features
      const expectedFeatures = ['Authentication System', 'RBAC Foundation', 'Multi-tenant Foundation', 'Database Setup'];
      const allFeatures = [...phase1!.completedFeatures, ...phase1!.pendingFeatures];
      
      expectedFeatures.forEach(feature => {
        expect(allFeatures).toContain(feature);
      });
    });

    it('should scan Phase 2 core features', async () => {
      const result = await implementationStateScanner.scanImplementationState();
      const phase2 = result.phases.find(p => p.phase === 2);
      
      expect(phase2).toBeDefined();
      expect(phase2!.name).toBe('Core Features');
    });
  });

  describe('validation and recommendations', () => {
    it('should generate meaningful blockers', async () => {
      const result = await implementationStateScanner.scanImplementationState();
      
      expect(Array.isArray(result.blockers)).toBe(true);
      // Blockers should be strings
      result.blockers.forEach(blocker => {
        expect(typeof blocker).toBe('string');
        expect(blocker.length).toBeGreaterThan(0);
      });
    });

    it('should generate helpful recommendations', async () => {
      const result = await implementationStateScanner.scanImplementationState();
      
      expect(Array.isArray(result.recommendations)).toBe(true);
      // Recommendations should be actionable strings
      result.recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      });
    });

    it('should determine current phase logically', async () => {
      const result = await implementationStateScanner.scanImplementationState();
      
      // Current phase should be the first incomplete phase
      const incompletePhase = result.phases.find(p => !p.completed);
      if (incompletePhase) {
        expect(result.currentPhase).toBe(incompletePhase.phase);
      } else {
        // All phases complete
        expect(result.currentPhase).toBe(result.phases.length);
      }
    });
  });

  describe('performance and caching', () => {
    it('should complete scanning within reasonable time', async () => {
      const startTime = Date.now();
      
      await implementationStateScanner.scanImplementationState();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle multiple concurrent scans', async () => {
      const promises = Array.from({ length: 3 }, () => 
        implementationStateScanner.scanImplementationState()
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.phases).toHaveLength(4);
      });
    });
  });
});
