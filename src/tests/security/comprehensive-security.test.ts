
// Comprehensive Security Testing Suite
// Testing all security implementations together

import { securityHeadersService } from '../../services/security/SecurityHeadersService';
import { csrfProtectionService } from '../../services/auth/CSRFProtectionService';

// Mock DOM environment
const mockSetAttribute = jest.fn();
const mockAppendChild = jest.fn();
const mockQuerySelector = jest.fn();
const mockCreateElement = jest.fn().mockReturnValue({
  setAttribute: mockSetAttribute,
  textContent: ''
});

Object.defineProperty(document, 'querySelector', {
  value: mockQuerySelector
});

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement
});

Object.defineProperty(document, 'head', {
  value: { appendChild: mockAppendChild, removeChild: jest.fn() }
});

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

// Mock crypto
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

describe('Comprehensive Security Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuerySelector.mockReturnValue(null);
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  describe('Security Headers + CSRF Integration', () => {
    test('should apply both security headers and CSRF protection', async () => {
      // Apply security headers
      securityHeadersService.applySecurityHeaders();
      
      // Generate CSRF token
      mockSessionStorage.getItem.mockReturnValue('test-session');
      const token = csrfProtectionService.generateToken();

      // Verify security headers were applied
      expect(mockCreateElement).toHaveBeenCalledWith('meta');
      expect(mockSetAttribute).toHaveBeenCalledWith('http-equiv', 'Content-Security-Policy');
      
      // Verify CSRF token was generated
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(32);
      
      // Verify CSRF headers include security context
      const headers = csrfProtectionService.getCSRFHeaders();
      expect(headers).toHaveProperty('X-CSRF-Token');
      expect(headers).toHaveProperty('X-Requested-With', 'XMLHttpRequest');
    });

    test('should handle security failures gracefully', async () => {
      // Simulate CSP violation
      mockCreateElement.mockImplementation(() => {
        throw new Error('CSP violation');
      });

      // Should not crash when applying headers fails
      expect(() => {
        securityHeadersService.applySecurityHeaders();
      }).not.toThrow();

      // CSRF should still work
      mockSessionStorage.getItem.mockReturnValue('fallback-session');
      const token = csrfProtectionService.generateToken();
      expect(token).toBeDefined();
    });
  });

  describe('Security Compliance Check', () => {
    test('should validate complete security implementation', async () => {
      // Mock secure environment
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:', hostname: 'secure.example.com' },
        writable: true
      });

      mockQuerySelector.mockReturnValue({ content: 'test-csp-policy' });
      mockSessionStorage.getItem.mockReturnValue('valid-session');

      // Check security compliance
      const compliance = securityHeadersService.checkSecurityCompliance();
      
      expect(compliance.httpsEnabled).toBe(true);
      expect(compliance.headersApplied).toBe(true);
      expect(compliance.recommendations.length).toBe(0);

      // Verify CSRF is operational
      const token = csrfProtectionService.generateToken();
      const isValid = csrfProtectionService.validateToken(token);
      expect(isValid).toBe(true);
    });

    test('should identify security gaps', async () => {
      // Mock insecure environment
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', hostname: 'insecure.example.com' },
        writable: true
      });

      mockQuerySelector.mockReturnValue(null);

      const compliance = securityHeadersService.checkSecurityCompliance();
      
      expect(compliance.httpsEnabled).toBe(false);
      expect(compliance.headersApplied).toBe(false);
      expect(compliance.recommendations.length).toBeGreaterThan(0);
      expect(compliance.recommendations).toContain('Enable HTTPS for production deployment');
    });
  });

  describe('Performance Impact Assessment', () => {
    test('should measure security overhead', async () => {
      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        // Simulate security operations
        securityHeadersService.getSecurityHeaders();
        
        mockSessionStorage.getItem.mockReturnValue(`session-${i}`);
        const token = csrfProtectionService.generateToken();
        csrfProtectionService.validateToken(token);
      }

      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / iterations;

      // Security operations should be fast (< 1ms per operation)
      expect(averageTime).toBeLessThan(1);
    });
  });
});
