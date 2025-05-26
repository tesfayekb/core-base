
// Authentication Service
// Version: 1.0.0 - User Authentication Management

import { supabase } from '../database';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  createdAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResult {
  user: User;
  session?: any;
  verificationToken?: string;
}

export class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(request: LoginRequest): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: request.email,
        password: request.password
      });

      if (error) throw error;

      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          emailVerified: !!data.user.email_confirmed_at,
          createdAt: new Date(data.user.created_at)
        },
        session: data.session
      };
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Authentication failed');
    }
  }

  async register(request: RegisterRequest): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: request.email,
        password: request.password,
        options: {
          data: {
            first_name: request.firstName,
            last_name: request.lastName
          }
        }
      });

      if (error) throw error;

      return {
        user: {
          id: data.user!.id,
          email: data.user!.email!,
          firstName: request.firstName,
          lastName: request.lastName,
          emailVerified: !!data.user!.email_confirmed_at,
          createdAt: new Date(data.user!.created_at)
        },
        session: data.session,
        verificationToken: data.user!.email_change_token_current
      };
    } catch (error) {
      console.error('Registration failed:', error);
      throw new Error('Registration failed');
    }
  }

  async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout failed:', error);
      throw new Error('Logout failed');
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      return {
        id: user.id,
        email: user.email!,
        emailVerified: !!user.email_confirmed_at,
        createdAt: new Date(user.created_at)
      };
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }
}

export const authService = AuthService.getInstance();
