
interface LoginAttempt {
  email: string;
  timestamp: number;
  success: boolean;
}

interface RateLimitStatus {
  isLocked: boolean;
  remainingAttempts: number;
  lockoutEndTime?: number;
  nextAttemptAllowed: number;
}

export class RateLimitService {
  private static instance: RateLimitService;
  private attempts: Map<string, LoginAttempt[]> = new Map();
  
  // Rate limiting configuration
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes
  private readonly MIN_DELAY_BETWEEN_ATTEMPTS = 1000; // 1 second

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  private constructor() {
    // Clean up old attempts periodically
    setInterval(() => this.cleanupOldAttempts(), 60 * 1000); // Every minute
  }

  checkRateLimit(email: string): RateLimitStatus {
    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();
    const userAttempts = this.attempts.get(normalizedEmail) || [];
    
    // Remove attempts outside the window
    const recentAttempts = userAttempts.filter(
      attempt => now - attempt.timestamp < this.ATTEMPT_WINDOW
    );
    
    // Count failed attempts
    const failedAttempts = recentAttempts.filter(attempt => !attempt.success);
    
    // Check if account is locked
    const lastFailedAttempt = failedAttempts[failedAttempts.length - 1];
    const isCurrentlyLocked = failedAttempts.length >= this.MAX_ATTEMPTS;
    
    if (isCurrentlyLocked && lastFailedAttempt) {
      const lockoutEndTime = lastFailedAttempt.timestamp + this.LOCKOUT_DURATION;
      
      if (now < lockoutEndTime) {
        return {
          isLocked: true,
          remainingAttempts: 0,
          lockoutEndTime,
          nextAttemptAllowed: lockoutEndTime
        };
      }
    }
    
    // Check minimum delay between attempts
    const lastAttempt = recentAttempts[recentAttempts.length - 1];
    const nextAttemptAllowed = lastAttempt 
      ? lastAttempt.timestamp + this.MIN_DELAY_BETWEEN_ATTEMPTS
      : now;
    
    return {
      isLocked: false,
      remainingAttempts: Math.max(0, this.MAX_ATTEMPTS - failedAttempts.length),
      nextAttemptAllowed
    };
  }

  recordAttempt(email: string, success: boolean): void {
    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();
    
    const userAttempts = this.attempts.get(normalizedEmail) || [];
    userAttempts.push({
      email: normalizedEmail,
      timestamp: now,
      success
    });
    
    this.attempts.set(normalizedEmail, userAttempts);
    
    console.log(`🔒 Rate limit: Recorded ${success ? 'successful' : 'failed'} attempt for ${normalizedEmail}`);
  }

  clearAttempts(email: string): void {
    const normalizedEmail = email.toLowerCase().trim();
    this.attempts.delete(normalizedEmail);
    console.log(`🔓 Rate limit: Cleared attempts for ${normalizedEmail}`);
  }

  private cleanupOldAttempts(): void {
    const now = Date.now();
    const cutoff = now - this.LOCKOUT_DURATION;
    
    for (const [email, attempts] of this.attempts.entries()) {
      const recentAttempts = attempts.filter(
        attempt => attempt.timestamp > cutoff
      );
      
      if (recentAttempts.length === 0) {
        this.attempts.delete(email);
      } else {
        this.attempts.set(email, recentAttempts);
      }
    }
  }

  getRateLimitInfo(): { totalUsers: number, lockedUsers: number } {
    const now = Date.now();
    let lockedUsers = 0;
    
    for (const [email, attempts] of this.attempts.entries()) {
      const status = this.checkRateLimit(email);
      if (status.isLocked) {
        lockedUsers++;
      }
    }
    
    return {
      totalUsers: this.attempts.size,
      lockedUsers
    };
  }
}

export const rateLimitService = RateLimitService.getInstance();
