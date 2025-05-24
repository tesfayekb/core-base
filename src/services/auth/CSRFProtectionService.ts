
interface CSRFToken {
  token: string;
  timestamp: number;
  sessionId: string;
}

export class CSRFProtectionService {
  private static instance: CSRFProtectionService;
  private readonly TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
  private readonly TOKEN_LENGTH = 32;
  private currentToken: CSRFToken | null = null;

  static getInstance(): CSRFProtectionService {
    if (!CSRFProtectionService.instance) {
      CSRFProtectionService.instance = new CSRFProtectionService();
    }
    return CSRFProtectionService.instance;
  }

  private constructor() {
    // Generate initial token on service creation
    this.generateToken();
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  }

  generateToken(): string {
    const sessionId = this.getOrCreateSessionId();
    const token = this.generateRandomString(this.TOKEN_LENGTH);
    
    this.currentToken = {
      token,
      timestamp: Date.now(),
      sessionId
    };

    // Store in sessionStorage for client-side validation
    sessionStorage.setItem('csrf_token', JSON.stringify(this.currentToken));
    
    console.log('🛡️ CSRF: Generated new token');
    return token;
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = this.generateRandomString(16);
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  validateToken(providedToken: string): boolean {
    if (!this.currentToken) {
      console.warn('⚠️ CSRF: No token available for validation');
      return false;
    }

    // Check if token has expired
    const now = Date.now();
    if (now - this.currentToken.timestamp > this.TOKEN_EXPIRY) {
      console.warn('⚠️ CSRF: Token has expired');
      this.generateToken(); // Generate new token
      return false;
    }

    // Validate token matches
    if (providedToken !== this.currentToken.token) {
      console.warn('⚠️ CSRF: Token mismatch');
      return false;
    }

    // Validate session ID
    const currentSessionId = sessionStorage.getItem('session_id');
    if (currentSessionId !== this.currentToken.sessionId) {
      console.warn('⚠️ CSRF: Session ID mismatch');
      return false;
    }

    console.log('✅ CSRF: Token validated successfully');
    return true;
  }

  getCurrentToken(): string {
    if (!this.currentToken || this.isTokenExpired()) {
      return this.generateToken();
    }
    return this.currentToken.token;
  }

  private isTokenExpired(): boolean {
    if (!this.currentToken) return true;
    return Date.now() - this.currentToken.timestamp > this.TOKEN_EXPIRY;
  }

  clearToken(): void {
    this.currentToken = null;
    sessionStorage.removeItem('csrf_token');
    sessionStorage.removeItem('session_id');
    console.log('🧹 CSRF: Tokens cleared');
  }

  // Validate stored token on page load
  validateStoredToken(): boolean {
    try {
      const storedToken = sessionStorage.getItem('csrf_token');
      if (!storedToken) return false;

      const tokenData: CSRFToken = JSON.parse(storedToken);
      
      // Check expiry
      if (Date.now() - tokenData.timestamp > this.TOKEN_EXPIRY) {
        this.clearToken();
        return false;
      }

      // Restore current token
      this.currentToken = tokenData;
      return true;
    } catch (error) {
      console.error('❌ CSRF: Error validating stored token:', error);
      this.clearToken();
      return false;
    }
  }

  // Get headers for API requests
  getCSRFHeaders(): Record<string, string> {
    return {
      'X-CSRF-Token': this.getCurrentToken(),
      'X-Requested-With': 'XMLHttpRequest'
    };
  }
}

export const csrfProtectionService = CSRFProtectionService.getInstance();
