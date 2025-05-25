
interface PasswordResetAttempt {
  email: string;
  timestamp: number;
}

interface PasswordResetRateLimit {
  isLimited: boolean;
  remainingAttempts: number;
  nextAttemptAllowed: number;
  resetWindow: number;
}

export class PasswordResetRateLimitService {
  private static instance: PasswordResetRateLimitService;
  private resetAttempts: Map<string, PasswordResetAttempt[]> = new Map();
  
  // Password reset rate limiting configuration
  private readonly MAX_RESET_ATTEMPTS = 3; // 3 reset requests per window
  private readonly RESET_WINDOW = 60 * 60 * 1000; // 1 hour window
  private readonly MIN_DELAY_BETWEEN_RESETS = 60 * 1000; // 1 minute between attempts

  static getInstance(): PasswordResetRateLimitService {
    if (!PasswordResetRateLimitService.instance) {
      PasswordResetRateLimitService.instance = new PasswordResetRateLimitService();
    }
    return PasswordResetRateLimitService.instance;
  }

  private constructor() {
    // Clean up old attempts periodically
    setInterval(() => this.cleanupOldAttempts(), 10 * 60 * 1000); // Every 10 minutes
  }

  checkResetRateLimit(email: string): PasswordResetRateLimit {
    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();
    const userAttempts = this.resetAttempts.get(normalizedEmail) || [];
    
    // Remove attempts outside the window
    const recentAttempts = userAttempts.filter(
      attempt => now - attempt.timestamp < this.RESET_WINDOW
    );
    
    // Check if rate limited
    const isRateLimited = recentAttempts.length >= this.MAX_RESET_ATTEMPTS;
    
    // Check minimum delay between attempts
    const lastAttempt = recentAttempts[recentAttempts.length - 1];
    const nextAttemptAllowed = lastAttempt 
      ? lastAttempt.timestamp + this.MIN_DELAY_BETWEEN_RESETS
      : now;
    
    const isDelayRequired = now < nextAttemptAllowed;
    
    return {
      isLimited: isRateLimited || isDelayRequired,
      remainingAttempts: Math.max(0, this.MAX_RESET_ATTEMPTS - recentAttempts.length),
      nextAttemptAllowed,
      resetWindow: this.RESET_WINDOW
    };
  }

  recordResetAttempt(email: string): void {
    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();
    
    const userAttempts = this.resetAttempts.get(normalizedEmail) || [];
    userAttempts.push({
      email: normalizedEmail,
      timestamp: now
    });
    
    this.resetAttempts.set(normalizedEmail, userAttempts);
    
    console.log(`🔒 Password reset rate limit: Recorded attempt for ${normalizedEmail}`);
  }

  private cleanupOldAttempts(): void {
    const now = Date.now();
    const cutoff = now - this.RESET_WINDOW;
    
    for (const [email, attempts] of this.resetAttempts.entries()) {
      const recentAttempts = attempts.filter(
        attempt => attempt.timestamp > cutoff
      );
      
      if (recentAttempts.length === 0) {
        this.resetAttempts.delete(email);
      } else {
        this.resetAttempts.set(email, recentAttempts);
      }
    }
  }

  getRateLimitInfo(): { totalUsers: number, rateLimitedUsers: number } {
    const now = Date.now();
    let rateLimitedUsers = 0;
    
    for (const [email] of this.resetAttempts.entries()) {
      const status = this.checkResetRateLimit(email);
      if (status.isLimited) {
        rateLimitedUsers++;
      }
    }
    
    return {
      totalUsers: this.resetAttempts.size,
      rateLimitedUsers
    };
  }
}

export const passwordResetRateLimitService = PasswordResetRateLimitService.getInstance();
