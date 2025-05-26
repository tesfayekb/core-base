
// Tenant Management Service
// Version: 1.0.0 - Multi-Tenant Operations

import { supabase } from '../database';

export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantRequest {
  name: string;
  ownerId: string;
  metadata?: Record<string, any>;
}

export class TenantService {
  private static instance: TenantService;

  static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService();
    }
    return TenantService.instance;
  }

  async createTenant(request: CreateTenantRequest): Promise<Tenant> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert({
          name: request.name,
          owner_id: request.ownerId,
          metadata: request.metadata || {},
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        status: data.status,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Failed to create tenant:', error);
      throw new Error('Tenant creation failed');
    }
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        status: data.status,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Failed to get tenant:', error);
      return null;
    }
  }

  async switchTenantContext(userId: string, tenantId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('switch_tenant_context', {
        p_user_id: userId,
        p_tenant_id: tenantId
      });

      return !error && !!data;
    } catch (error) {
      console.error('Failed to switch tenant context:', error);
      return false;
    }
  }
}

export const tenantService = TenantService.getInstance();
