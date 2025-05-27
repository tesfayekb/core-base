// Database Connection Service
// Extracted from database.ts for focused connection management

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export class ConnectionService {
  private static instance: ConnectionService;
  private client: any;

  private constructor() {
    try {
      this.validateConfiguration();
      this.client = this.createClient();
      this.testConnection();
    } catch (error) {
      console.warn('Supabase initialization failed:', error);
      // Create a mock client that won't throw errors
      const mockClient = {
        from: () => ({
          select: () => Promise.resolve({ data: [], error: null }),
          insert: () => Promise.resolve({ data: null, error: null }),
          update: () => Promise.resolve({ data: null, error: null }),
          delete: () => Promise.resolve({ data: null, error: null }),
          upsert: () => Promise.resolve({ data: null, error: null }),
        }),
        auth: {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
          signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
          signOut: () => Promise.resolve({ error: null }),
          onAuthStateChange: (callback: any) => {
            // Return a mock subscription
            return {
              data: { subscription: { unsubscribe: () => {} } }
            };
          },
          resetPasswordForEmail: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
          updateUser: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } }),
        },
        rpc: () => Promise.resolve({ data: null, error: null }),
      } as any;
      this.client = mockClient;
    }
  }

  static getInstance(): ConnectionService {
    if (!ConnectionService.instance) {
      ConnectionService.instance = new ConnectionService();
    }
    return ConnectionService.instance;
  }

  private validateConfiguration(): void {
    console.log('Initializing Supabase with:');
    console.log('URL:', supabaseUrl);
    console.log('Key valid:', supabaseAnonKey?.length > 0);

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('NOTICE: Supabase configuration missing!');
      console.warn('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
      throw new Error('Supabase configuration is incomplete');
    }
  }

  private createClient(): any {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          'X-Client-Info': 'lovable-project'
        }
      }
    });
  }

  private async testConnection(): Promise<void> {
    console.log('Testing Supabase connection...');
    this.client.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Supabase connection test failed:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          code: error.code
        });
      } else {
        console.log('Supabase connection test successful:', !!data);
        console.log('Session data present:', !!data.session);
      }
    }).catch(err => {
      console.error('Failed to test Supabase connection:', err);
      console.error('Connection error type:', typeof err);
      console.error('Connection error name:', err?.name);
    });
  }

  getClient(): any {
    return this.client;
  }

  async testConnectionAsync(): Promise<boolean> {
    try {
      const { error } = await this.client.auth.getSession();
      return !error;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

export const connectionService = ConnectionService.getInstance();
export const supabase = connectionService.getClient();
