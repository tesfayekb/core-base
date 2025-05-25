
export class CSRFProtectionService {
  private static instance: CSRFProtectionService;
  private currentToken: string = '';
  private readonly tokenKey = 'csrf_token';
  private readonly tokenExpiry = 60 * 60 * 1000; // 1 hour

  static getInstance(): CSRFProtectionService {
    if (!CSRFProtectionService.instance) {
      CSRFProtectionService.instance = new CSRFProtectionService();
    }
    return CSRFProtectionService.instance;
  }

  private constructor() {
    this.initializeToken();
  }

  generateToken(): string {
    const token = this.generateSecureToken();
    const tokenData = {
      token,
      timestamp: Date.now()
    };
    
    localStorage.setItem(this.tokenKey, JSON.stringify(tokenData));
    this.currentToken = token;
    return token;
  }

  validateToken(providedToken: string): boolean {
    const storedData = localStorage.getItem(this.tokenKey);
    
    if (!storedData) {
      return false;
    }

    try {
      const { token, timestamp } = JSON.parse(storedData);
      
      // Check if token has expired
      if (Date.now() - timestamp > this.tokenExpiry) {
        this.clearToken();
        return false;
      }

      // Compare tokens
      return token === providedToken;
    } catch (error) {
      console.error('Error validating CSRF token:', error);
      return false;
    }
  }

  getCurrentToken(): string {
    if (!this.currentToken || !this.validateStoredToken()) {
      return this.generateToken();
    }
    return this.currentToken;
  }

  validateStoredToken(): boolean {
    const storedData = localStorage.getItem(this.tokenKey);
    
    if (!storedData) {
      return false;
    }

    try {
      const { timestamp } = JSON.parse(storedData);
      return Date.now() - timestamp <= this.tokenExpiry;
    } catch {
      return false;
    }
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentToken = '';
  }

  getCSRFHeaders(): Record<string, string> {
    return {
      'X-CSRF-Token': this.getCurrentToken()
    };
  }

  private initializeToken(): void {
    if (!this.validateStoredToken()) {
      this.generateToken();
    } else {
      const storedData = localStorage.getItem(this.tokenKey);
      if (storedData) {
        const { token } = JSON.parse(storedData);
        this.currentToken = token;
      }
    }
  }

  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

export const csrfProtectionService = CSRFProtectionService.getInstance();
