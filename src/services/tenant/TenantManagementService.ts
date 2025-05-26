
// Tenant Management Service
// Version: 1.0.0 - Comprehensive Tenant Administration

import { supabase } from '../database';

export interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: 'active' | 'inactive' | 'suspended';
  settings: {
    maxUsers?: number;
    storageQuota?: number; // MB
    features: string[];
    customBranding?: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface TenantUsageAnalytics {
  tenantId: string;
  activeUsers: number;
  totalUsers: number;
  storageUsed: number; // MB
  apiCalls: number;
  lastActivity: Date;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  domain?: string;
  ownerId: string;
  settings?: Partial<TenantConfig['settings']>;
  metadata?: Record<string, any>;
}

export interface TenantHealthStatus {
  tenantId: string;
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    responseTime: number;
    errorRate: number;
    activeConnections: number;
    resourceUsage: number;
  };
  lastChecked: Date;
}

export class TenantManagementService {
  private static instance: TenantManagementService;

  static getInstance(): TenantManagementService {
    if (!TenantManagementService.instance) {
      TenantManagementService.instance = new TenantManagementService();
    }
    return TenantManagementService.instance;
  }

  async createTenant(request: CreateTenantRequest): Promise<TenantConfig> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert({
          name: request.name,
          slug: request.slug,
          domain: request.domain,
          settings: {
            maxUsers: 100,
            storageQuota: 1000,
            features: ['basic'],
            ...request.settings
          },
          status: 'active',
          created_by: request.ownerId,
          metadata: request.metadata || {}
        })
        .select()
        .single();

      if (error) throw error;

      // Create owner relationship
      await this.addUserToTenant(data.id, request.ownerId, true);

      return this.mapToTenantConfig(data);
    } catch (error) {
      console.error('Failed to create tenant:', error);
      throw new Error('Tenant creation failed');
    }
  }

  async getTenant(tenantId: string): Promise<TenantConfig | null> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error || !data) return null;

      return this.mapToTenantConfig(data);
    } catch (error) {
      console.error('Failed to get tenant:', error);
      return null;
    }
  }

  async updateTenantConfiguration(
    tenantId: string, 
    updates: Partial<Pick<TenantConfig, 'name' | 'domain' | 'status' | 'settings'>>
  ): Promise<TenantConfig | null> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToTenantConfig(data);
    } catch (error) {
      console.error('Failed to update tenant:', error);
      return null;
    }
  }

  async getAllTenants(): Promise<TenantConfig[]> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(tenant => this.mapToTenantConfig(tenant));
    } catch (error) {
      console.error('Failed to get tenants:', error);
      return [];
    }
  }

  async addUserToTenant(tenantId: string, userId: string, isPrimary = false): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_tenants')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          is_primary: isPrimary
        });

      return !error;
    } catch (error) {
      console.error('Failed to add user to tenant:', error);
      return false;
    }
  }

  async removeUserFromTenant(tenantId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_tenants')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Failed to remove user from tenant:', error);
      return false;
    }
  }

  async getTenantUsageAnalytics(tenantId: string): Promise<TenantUsageAnalytics> {
    try {
      // This would typically aggregate from multiple sources
      // For now, we'll provide mock analytics
      const { data: userCount } = await supabase
        .from('user_tenants')
        .select('user_id', { count: 'exact' })
        .eq('tenant_id', tenantId);

      return {
        tenantId,
        activeUsers: Math.floor((userCount?.length || 0) * 0.8),
        totalUsers: userCount?.length || 0,
        storageUsed: Math.floor(Math.random() * 500),
        apiCalls: Math.floor(Math.random() * 10000),
        lastActivity: new Date()
      };
    } catch (error) {
      console.error('Failed to get tenant analytics:', error);
      return {
        tenantId,
        activeUsers: 0,
        totalUsers: 0,
        storageUsed: 0,
        apiCalls: 0,
        lastActivity: new Date()
      };
    }
  }

  async getTenantHealthStatus(tenantId: string): Promise<TenantHealthStatus> {
    try {
      // Mock health status - in production, this would check actual metrics
      const responseTime = Math.random() * 200 + 50;
      const errorRate = Math.random() * 5;
      const resourceUsage = Math.random() * 100;

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (responseTime > 150 || errorRate > 2 || resourceUsage > 80) {
        status = 'warning';
      }
      if (responseTime > 200 || errorRate > 5 || resourceUsage > 95) {
        status = 'critical';
      }

      return {
        tenantId,
        status,
        metrics: {
          responseTime,
          errorRate,
          activeConnections: Math.floor(Math.random() * 100),
          resourceUsage
        },
        lastChecked: new Date()
      };
    } catch (error) {
      console.error('Failed to get tenant health:', error);
      return {
        tenantId,
        status: 'critical',
        metrics: {
          responseTime: 0,
          errorRate: 100,
          activeConnections: 0,
          resourceUsage: 0
        },
        lastChecked: new Date()
      };
    }
  }

  private mapToTenantConfig(data: any): TenantConfig {
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      domain: data.domain,
      status: data.status,
      settings: data.settings || { features: [] },
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      metadata: data.metadata || {}
    };
  }
}

export const tenantManagementService = TenantManagementService.getInstance();
