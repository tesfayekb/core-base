
import { csrfProtectionService } from '../../services/auth/CSRFProtectionService';

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

// Mock crypto.getRandomValues
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

describe('CSRFProtectionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
    
    // Reset service instance
    const service = csrfProtectionService as any;
    service.currentToken = null;
  });

  describe('Token Generation', () => {
    test('should generate a valid CSRF token', () => {
      mockSessionStorage.getItem.mockReturnValue('test-session-id');
      
      const token = csrfProtectionService.generateToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(32);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('csrf_token', expect.any(String));
    });

    test('should create session ID if none exists', () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      
      csrfProtectionService.generateToken();
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('session_id', expect.any(String));
    });
  });

  describe('Token Validation', () => {
    test('should validate correct token', () => {
      mockSessionStorage.getItem.mockReturnValue('test-session-id');
      
      const token = csrfProtectionService.generateToken();
      const isValid = csrfProtectionService.validateToken(token);
      
      expect(isValid).toBe(true);
    });

    test('should reject invalid token', () => {
      mockSessionStorage.getItem.mockReturnValue('test-session-id');
      
      csrfProtectionService.generateToken();
      const isValid = csrfProtectionService.validateToken('invalid-token');
      
      expect(isValid).toBe(false);
    });

    test('should reject token with mismatched session ID', () => {
      mockSessionStorage.getItem
        .mockReturnValueOnce('original-session')
        .mockReturnValueOnce('different-session');
      
      const token = csrfProtectionService.generateToken();
      const isValid = csrfProtectionService.validateToken(token);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Token Expiry', () => {
    test('should reject expired token', () => {
      mockSessionStorage.getItem.mockReturnValue('test-session-id');
      
      const token = csrfProtectionService.generateToken();
      
      // Mock expired timestamp
      const service = csrfProtectionService as any;
      service.currentToken.timestamp = Date.now() - (61 * 60 * 1000); // 61 minutes ago
      
      const isValid = csrfProtectionService.validateToken(token);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Token Cleanup', () => {
    test('should clear tokens', () => {
      csrfProtectionService.clearToken();
      
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('csrf_token');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('session_id');
    });
  });

  describe('Headers Generation', () => {
    test('should generate correct headers', () => {
      mockSessionStorage.getItem.mockReturnValue('test-session-id');
      
      const headers = csrfProtectionService.getCSRFHeaders();
      
      expect(headers).toHaveProperty('X-CSRF-Token');
      expect(headers).toHaveProperty('X-Requested-With', 'XMLHttpRequest');
    });
  });
});
