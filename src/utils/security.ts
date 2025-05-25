
// Security headers configuration
export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()'
} as const;

// Security validation functions
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function isValidPassword(password: string): boolean {
  // At least 8 characters, one uppercase, one lowercase, one number
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return minLength && hasUpper && hasLower && hasNumber;
}

export function sanitizeForDisplay(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Rate limiting for client-side (basic implementation)
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxAttempts: number;

  constructor(windowMs: number = 60000, maxAttempts: number = 5) {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }

    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    
    return true;
  }

  getRemainingAttempts(key: string): number {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxAttempts - validAttempts.length);
  }
}

export const loginRateLimiter = new RateLimiter(60000, 5); // 5 attempts per minute
export const passwordResetRateLimiter = new RateLimiter(300000, 3); // 3 attempts per 5 minutes

// Security event detection
export function detectSuspiciousActivity(
  event: string,
  metadata: Record<string, any>
): boolean {
  // Basic suspicious activity detection
  const suspiciousPatterns = [
    /script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload/i,
    /onerror/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  const textToCheck = JSON.stringify(metadata).toLowerCase();
  
  return suspiciousPatterns.some(pattern => pattern.test(textToCheck));
}

// Error sanitization
export function sanitizeError(error: any): { message: string; code?: string } {
  // Never expose internal errors to the user
  if (typeof error === 'string') {
    return { message: 'An error occurred. Please try again.' };
  }

  if (error && typeof error === 'object') {
    // Allow certain safe error messages
    const safeMessages = [
      'Invalid email or password',
      'User not found',
      'Invalid credentials',
      'Session expired',
      'Access denied',
      'Validation failed'
    ];

    const errorMessage = error.message || error.error_description || 'Unknown error';
    
    if (safeMessages.some(safe => errorMessage.includes(safe))) {
      return { 
        message: errorMessage,
        code: error.code 
      };
    }
  }

  return { message: 'An error occurred. Please try again.' };
}
