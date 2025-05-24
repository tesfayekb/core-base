
import { useEffect, useState } from 'react';
import { csrfProtectionService } from '@/services/auth/CSRFProtectionService';

export function useCSRFProtection() {
  const [token, setToken] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(false);

  useEffect(() => {
    // Validate any existing stored token on mount
    const hasValidStoredToken = csrfProtectionService.validateStoredToken();
    
    if (!hasValidStoredToken) {
      // Generate new token if none exists or stored token is invalid
      const newToken = csrfProtectionService.generateToken();
      setToken(newToken);
    } else {
      // Use existing valid token
      const currentToken = csrfProtectionService.getCurrentToken();
      setToken(currentToken);
    }
    
    setIsValid(true);
  }, []);

  const regenerateToken = () => {
    const newToken = csrfProtectionService.generateToken();
    setToken(newToken);
    return newToken;
  };

  const validateToken = (providedToken: string): boolean => {
    return csrfProtectionService.validateToken(providedToken);
  };

  const getHeaders = (): Record<string, string> => {
    return csrfProtectionService.getCSRFHeaders();
  };

  const clearTokens = () => {
    csrfProtectionService.clearToken();
    setToken('');
    setIsValid(false);
  };

  return {
    token,
    isValid,
    regenerateToken,
    validateToken,
    getHeaders,
    clearTokens
  };
}
