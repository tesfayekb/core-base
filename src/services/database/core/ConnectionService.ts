
// Database Connection Service
// Extracted from database.ts for focused connection management

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fhzhlyskfjvcwcqjssmb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoemhseXNrZmp2Y3djcWpzc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjIzMTksImV4cCI6MjA2MzYzODMxOX0.S2-LU5bi34Pcrg-XNEHj_SBQzxQncIe4tnOfhuyedNk';

export class ConnectionService {
  private static instance: ConnectionService;
  private client: any;

  private constructor() {
    this.validateConfiguration();
    this.client = this.createClient();
    this.testConnection();
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
    console.log('Using anon key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('CRITICAL: Supabase configuration missing!');
      console.error('URL:', supabaseUrl);
      console.error('Key present:', !!supabaseAnonKey);
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

  private testConnection(): void {
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
