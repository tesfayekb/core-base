import { supabase } from './database';
import { z } from 'zod';
import { measureAuthOperation } from './performance/DatabaseMeasurementUtilities';
import { rateLimitService } from './auth/RateLimitService';
import { csrfProtectionService } from './auth/CSRFProtectionService';

// Validation schemas
const EmailSchema = z.string().email().min(1).max(255);
const PasswordSchema = z.string().min(8).max(128);

const UserCredentialsSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional()
});

export interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
  requiresVerification?: boolean;
}

export class AuthService {
  private validateCSRFForSensitiveOperation(operation: string): boolean {
    const token = csrfProtectionService.getCurrentToken();
    const isValid = csrfProtectionService.validateToken(token);
    
    if (!isValid) {
      console.warn(`🛡️ CSRF validation failed for ${operation}`);
    }
    
    return isValid;
  }

  async signUp(credentials: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResult> {
    return await measureAuthOperation('user_signup', async () => {
      try {
        console.log('🚀 AuthService: Starting signup for:', credentials.email);
        
        // 1. CSRF Protection for sensitive signup operation
        if (!this.validateCSRFForSensitiveOperation('signup')) {
          return {
            success: false,
            error: 'Security validation failed. Please refresh the page and try again.'
          };
        }

        // 1. Check rate limit first
        const rateLimitStatus = rateLimitService.checkRateLimit(credentials.email);
        if (rateLimitStatus.isLocked) {
          const lockoutMinutes = Math.ceil((rateLimitStatus.lockoutEndTime! - Date.now()) / (60 * 1000));
          return {
            success: false,
            error: `Account temporarily locked. Please try again in ${lockoutMinutes} minutes.`
          };
        }

        // 2. Validate input
        const validation = UserCredentialsSchema.safeParse(credentials);
        if (!validation.success) {
          console.error('❌ Validation failed:', validation.error.errors);
          rateLimitService.recordAttempt(credentials.email, false);
          return {
            success: false,
            error: 'Invalid input: ' + validation.error.errors.map(e => e.message).join(', ')
          };
        }

        // 3. Check minimum delay between attempts
        if (Date.now() < rateLimitStatus.nextAttemptAllowed) {
          return {
            success: false,
            error: 'Please wait a moment before trying again.'
          };
        }

        // 4. Attempt Supabase signup with CSRF headers
        const { data, error } = await supabase.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options: {
            data: {
              first_name: credentials.firstName,
              last_name: credentials.lastName,
              full_name: `${credentials.firstName || ''} ${credentials.lastName || ''}`.trim()
            }
          }
        });

        if (error) {
          console.error('❌ Supabase signup error:', error.message);
          rateLimitService.recordAttempt(credentials.email, false);
          return {
            success: false,
            error: this.formatAuthError(error.message)
          };
        }

        console.log('✅ Signup successful:', data.user?.email);
        rateLimitService.recordAttempt(credentials.email, true);
        
        // 5. Check if email confirmation is required
        if (data.user && !data.session) {
          return {
            success: true,
            user: data.user,
            requiresVerification: true
          };
        }

        return {
          success: true,
          user: data.user
        };

      } catch (error) {
        console.error('💥 Signup exception:', error);
        rateLimitService.recordAttempt(credentials.email, false);
        return {
          success: false,
          error: 'An unexpected error occurred during registration'
        };
      }
    });
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    return await measureAuthOperation('user_signin', async () => {
      try {
        console.log('🔐 AuthService: Starting signin for:', email);
        
        // 1. CSRF Protection for sensitive signin operation
        if (!this.validateCSRFForSensitiveOperation('signin')) {
          return {
            success: false,
            error: 'Security validation failed. Please refresh the page and try again.'
          };
        }

        // 1. Check rate limit first
        const rateLimitStatus = rateLimitService.checkRateLimit(email);
        if (rateLimitStatus.isLocked) {
          const lockoutMinutes = Math.ceil((rateLimitStatus.lockoutEndTime! - Date.now()) / (60 * 1000));
          return {
            success: false,
            error: `Account temporarily locked due to too many failed attempts. Please try again in ${lockoutMinutes} minutes.`
          };
        }

        // 2. Validate email format only
        const emailValidation = EmailSchema.safeParse(email);
        if (!emailValidation.success) {
          rateLimitService.recordAttempt(email, false);
          return {
            success: false,
            error: 'Invalid email format'
          };
        }

        // 3. Check minimum delay between attempts
        if (Date.now() < rateLimitStatus.nextAttemptAllowed) {
          return {
            success: false,
            error: 'Please wait a moment before trying again.'
          };
        }

        // 4. Attempt authentication
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          console.error('❌ Signin error:', error.message);
          rateLimitService.recordAttempt(email, false);
          
          // Provide remaining attempts info for failed login
          const updatedStatus = rateLimitService.checkRateLimit(email);
          const remainingText = updatedStatus.remainingAttempts > 0 
            ? ` (${updatedStatus.remainingAttempts} attempts remaining)`
            : '';
          
          return {
            success: false,
            error: this.formatAuthError(error.message) + remainingText
          };
        }

        console.log('✅ Signin successful:', data.user?.email);
        rateLimitService.recordAttempt(email, true);
        
        // Clear all failed attempts on successful login
        rateLimitService.clearAttempts(email);
        
        return {
          success: true,
          user: data.user
        };

      } catch (error) {
        console.error('💥 Signin exception:', error);
        rateLimitService.recordAttempt(email, false);
        return {
          success: false,
          error: 'An unexpected error occurred during login'
        };
      }
    });
  }

  async signOut(): Promise<void> {
    try {
      console.log('🚪 AuthService: Starting signout');
      
      // Clear CSRF tokens on logout
      csrfProtectionService.clearToken();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Signout error:', error.message);
        throw error;
      }
      
      console.log('✅ Signout successful');
    } catch (error) {
      console.error('💥 Signout exception:', error);
      throw error;
    }
  }

  async resetPassword(email: string): Promise<AuthResult> {
    try {
      console.log('🔄 AuthService: Password reset for:', email);
      
      // CSRF Protection for password reset
      if (!this.validateCSRFForSensitiveOperation('password_reset')) {
        return {
          success: false,
          error: 'Security validation failed. Please refresh the page and try again.'
        };
      }

      const emailValidation = EmailSchema.safeParse(email);
      if (!emailValidation.success) {
        return {
          success: false,
          error: 'Invalid email format'
        };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        console.error('❌ Password reset error:', error.message);
        return {
          success: false,
          error: this.formatAuthError(error.message)
        };
      }

      console.log('✅ Password reset email sent');
      return {
        success: true
      };

    } catch (error) {
      console.error('💥 Password reset exception:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during password reset'
      };
    }
  }

  async updatePassword(newPassword: string): Promise<AuthResult> {
    try {
      // CSRF Protection for password update
      if (!this.validateCSRFForSensitiveOperation('password_update')) {
        return {
          success: false,
          error: 'Security validation failed. Please refresh the page and try again.'
        };
      }

      const passwordValidation = PasswordSchema.safeParse(newPassword);
      if (!passwordValidation.success) {
        return {
          success: false,
          error: 'Password must be at least 8 characters long'
        };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return {
          success: false,
          error: this.formatAuthError(error.message)
        };
      }

      return {
        success: true
      };

    } catch (error) {
      console.error('💥 Password update exception:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during password update'
      };
    }
  }

  private formatAuthError(errorMessage: string): string {
    // Provide user-friendly error messages
    if (errorMessage.includes('Invalid login credentials')) {
      return 'Invalid email or password';
    }
    if (errorMessage.includes('User already registered')) {
      return 'An account with this email already exists';
    }
    if (errorMessage.includes('Password should be')) {
      return 'Password must be at least 8 characters long';
    }
    if (errorMessage.includes('Unable to validate email address')) {
      return 'Please enter a valid email address';
    }
    if (errorMessage.includes('Email not confirmed')) {
      return 'Please confirm your email address before signing in';
    }
    
    return errorMessage;
  }
}

export const authService = new AuthService();
