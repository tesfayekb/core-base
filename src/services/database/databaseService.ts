
// Database Service
// Main database operations with tenant context support

import { supabase } from './connection';
import { tenantContextService } from './tenantContext';

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export class DatabaseService {
  private static instance: DatabaseService;

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async testConnection(): Promise<boolean> {
    try {
      const { error } = await supabase.from('tenants').select('count', { count: 'exact', head: true });
      return !error;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  async initialize(context: string): Promise<void> {
    console.log(`Initializing database service for context: ${context}`);
    // Mock initialization
  }

  async getStatus(): Promise<{ totalMigrations: number }> {
    return { totalMigrations: 10 };
  }

  async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
    console.log(`Executing query: ${sql}`, params);
    // Mock query execution
    return { rows: [] };
  }

  async setTenantContext(tenantId: string): Promise<void> {
    await tenantContextService.setTenantContext(tenantId);
  }

  async setUserContext(userId: string): Promise<void> {
    await tenantContextService.setUserContext(userId);
  }

  async clearContexts(): Promise<void> {
    tenantContextService.clearContext();
  }

  async cleanup(): Promise<void> {
    console.log('Database cleanup completed');
    this.clearContexts();
  }
}

export const databaseService = DatabaseService.getInstance();
