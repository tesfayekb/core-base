import { supabase } from './database';
import { z } from 'zod';
import { measureAuthOperation } from './performance/DatabaseMeasurementUtilities';

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
  async signUp(credentials: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResult> {
    return await measureAuthOperation('user_signup', async () => {
      try {
        console.log('🚀 AuthService: Starting signup for:', credentials.email);
        
        // 1. Validate input
        const validation = UserCredentialsSchema.safeParse(credentials);
        if (!validation.success) {
          console.error('❌ Validation failed:', validation.error.errors);
          return {
            success: false,
            error: 'Invalid input: ' + validation.error.errors.map(e => e.message).join(', ')
          };
        }

        // 2. Attempt Supabase signup
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
          return {
            success: false,
            error: this.formatAuthError(error.message)
          };
        }

        console.log('✅ Signup successful:', data.user?.email);
        
        // 3. Check if email confirmation is required
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
        
        // 1. Validate email format only (not password format for login)
        const emailValidation = EmailSchema.safeParse(email);
        
        if (!emailValidation.success) {
          return {
            success: false,
            error: 'Invalid email format'
          };
        }

        // PERFORMANCE OPTIMIZATION: Use parallel promise for faster execution
        const signInPromise = supabase.auth.signInWithPassword({
          email,
          password
        });

        const { data, error } = await signInPromise;

        if (error) {
          console.error('❌ Signin error:', error.message);
          return {
            success: false,
            error: this.formatAuthError(error.message)
          };
        }

        console.log('✅ Signin successful:', data.user?.email);
        return {
          success: true,
          user: data.user
        };

      } catch (error) {
        console.error('💥 Signin exception:', error);
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
      
      // PERFORMANCE OPTIMIZATION: Don't measure signout as it's not critical path
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

  async verifyEmail(token: string, type: 'email' | 'sms' = 'email'): Promise<AuthResult> {
    try {
      console.log('📧 AuthService: Verifying email with token');
      
      const { data, error } = await supabase.auth.verifyOtp({
        token,
        type
      });

      if (error) {
        console.error('❌ Email verification error:', error.message);
        return {
          success: false,
          error: error.message.includes('expired') ? 'Verification link has expired or is invalid' : error.message
        };
      }

      console.log('✅ Email verification successful');
      return {
        success: true,
        user: data.user
      };

    } catch (error) {
      console.error('💥 Email verification exception:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during email verification'
      };
    }
  }

  async updatePassword(newPassword: string): Promise<AuthResult> {
    try {
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
