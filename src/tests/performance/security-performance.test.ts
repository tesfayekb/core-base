
// Security Performance Testing
// Validates that security implementations meet performance standards

import { securityHeadersService } from '../../services/security/SecurityHeadersService';
import { csrfProtectionService } from '../../services/auth/CSRFProtectionService';
import { performanceTargets } from '../utils/test-helpers';

// Mock environment
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    })
  }
});

describe('Security Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue('test-session');
  });

  describe('CSRF Token Performance', () => {
    test('should generate tokens within performance target', async () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        csrfProtectionService.generateToken();
      }

      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / iterations;

      // Should be very fast - target < 1ms per generation
      expect(averageTime).toBeLessThan(1);
    });

    test('should validate tokens within performance target', async () => {
      // Pre-generate tokens
      const tokens = [];
      for (let i = 0; i < 100; i++) {
        tokens.push(csrfProtectionService.generateToken());
      }

      const startTime = performance.now();

      for (const token of tokens) {
        csrfProtectionService.validateToken(token);
      }

      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / tokens.length;

      // Should be very fast - target < 0.5ms per validation
      expect(averageTime).toBeLessThan(0.5);
    });
  });

  describe('Security Headers Performance', () => {
    test('should generate headers within performance target', async () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        securityHeadersService.getSecurityHeaders();
      }

      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / iterations;

      // Should be very fast - target < 0.1ms per generation
      expect(averageTime).toBeLessThan(0.1);
    });

    test('should not impact page load significantly', async () => {
      const startTime = performance.now();
      
      // Simulate applying headers during app initialization
      securityHeadersService.applySecurityHeaders();
      securityHeadersService.checkSecurityCompliance();
      
      const totalTime = performance.now() - startTime;

      // Should complete in under 10ms
      expect(totalTime).toBeLessThan(10);
    });
  });

  describe('Memory Usage', () => {
    test('should not leak memory during token operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 10000; i++) {
        const token = csrfProtectionService.generateToken();
        csrfProtectionService.validateToken(token);
        
        // Simulate cleanup every 1000 operations
        if (i % 1000 === 0) {
          csrfProtectionService.clearToken();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not increase memory by more than 10MB
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
