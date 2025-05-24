
import { securityHeadersService } from '../../services/security/SecurityHeadersService';

// Mock DOM methods
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

// Mock window.location
const mockLocation = {
  protocol: 'https:',
  hostname: 'example.com'
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

describe('SecurityHeadersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuerySelector.mockReturnValue(null);
  });

  describe('Security Headers Generation', () => {
    test('should generate comprehensive security headers', () => {
      const headers = securityHeadersService.getSecurityHeaders();
      
      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff');
      expect(headers).toHaveProperty('X-Frame-Options', 'DENY');
      expect(headers).toHaveProperty('X-XSS-Protection', '1; mode=block');
      expect(headers).toHaveProperty('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(headers).toHaveProperty('Permissions-Policy');
      expect(headers).toHaveProperty('Strict-Transport-Security');
    });

    test('should include proper CSP directives', () => {
      const headers = securityHeadersService.getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain('upgrade-insecure-requests');
      expect(csp).toContain('https://*.supabase.co');
    });
  });

  describe('Header Application', () => {
    test('should apply security headers as meta tags', () => {
      securityHeadersService.applySecurityHeaders();
      
      expect(mockCreateElement).toHaveBeenCalledWith('meta');
      expect(mockSetAttribute).toHaveBeenCalledWith('http-equiv', 'Content-Security-Policy');
      expect(mockAppendChild).toHaveBeenCalled();
    });

    test('should update existing meta tags', () => {
      const mockExistingMeta = {
        setAttribute: mockSetAttribute
      };
      mockQuerySelector.mockReturnValue(mockExistingMeta);
      
      securityHeadersService.applySecurityHeaders();
      
      expect(mockSetAttribute).toHaveBeenCalled();
      expect(mockCreateElement).not.toHaveBeenCalled();
    });
  });

  describe('HTTPS Validation', () => {
    test('should validate HTTPS in production', () => {
      const result = securityHeadersService.validateHTTPS();
      expect(result).toBe(true);
    });

    test('should allow HTTP on localhost', () => {
      mockLocation.protocol = 'http:';
      mockLocation.hostname = 'localhost';
      
      const result = securityHeadersService.validateHTTPS();
      expect(result).toBe(true);
    });

    test('should warn about HTTP in production', () => {
      mockLocation.protocol = 'http:';
      mockLocation.hostname = 'production.com';
      
      const result = securityHeadersService.validateHTTPS();
      expect(result).toBe(false);
    });
  });

  describe('Security Compliance Check', () => {
    test('should check overall security compliance', () => {
      mockQuerySelector.mockReturnValue({ content: 'test-csp' });
      
      const compliance = securityHeadersService.checkSecurityCompliance();
      
      expect(compliance).toHaveProperty('httpsEnabled');
      expect(compliance).toHaveProperty('headersApplied');
      expect(compliance).toHaveProperty('cspActive');
      expect(compliance).toHaveProperty('recommendations');
      expect(Array.isArray(compliance.recommendations)).toBe(true);
    });

    test('should provide recommendations for non-compliant setup', () => {
      mockLocation.protocol = 'http:';
      mockLocation.hostname = 'production.com';
      mockQuerySelector.mockReturnValue(null);
      
      const compliance = securityHeadersService.checkSecurityCompliance();
      
      expect(compliance.recommendations.length).toBeGreaterThan(0);
      expect(compliance.recommendations).toContain('Enable HTTPS for production deployment');
    });
  });
});
