
import { supabase } from '@/integrations/supabase/client';

export interface QuotaValidationResult {
  allowed: boolean;
  current_usage: number;
  quota_limit: number | null;
  usage_percentage: number;
  warning: boolean;
  quota_exceeded: boolean;
}

export interface ResourceQuota {
  id: string;
  tenant_id: string;
  resource_type: string;
  quota_limit: number;
  hard_limit: boolean;
  warning_threshold: number;
  reset_period: string;
  effective_from: string;
  effective_until?: string;
}

export interface ResourceUsage {
  id: string;
  tenant_id: string;
  resource_type: string;
  current_usage: number;
  period_start: string;
  period_end?: string;
  last_updated: string;
  metadata: Record<string, any>;
}

export class TenantQuotaService {
  private static instance: TenantQuotaService;

  static getInstance(): TenantQuotaService {
    if (!TenantQuotaService.instance) {
      TenantQuotaService.instance = new TenantQuotaService();
    }
    return TenantQuotaService.instance;
  }

  async validateQuota(
    tenantId: string,
    resourceType: string,
    increment: number = 1,
    checkOnly: boolean = false
  ): Promise<QuotaValidationResult> {
    try {
      const { data, error } = await supabase.rpc('validate_and_update_quota', {
        p_tenant_id: tenantId,
        p_resource_type: resourceType,
        p_increment: increment,
        p_check_only: checkOnly
      });

      if (error) {
        console.error('Quota validation error:', error);
        throw new Error(`Quota validation failed: ${error.message}`);
      }

      return data as QuotaValidationResult;
    } catch (error) {
      console.error('Failed to validate quota:', error);
      throw error;
    }
  }

  async getTenantQuotas(tenantId: string): Promise<ResourceQuota[]> {
    try {
      const { data, error } = await supabase
        .from('tenant_resource_quotas')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('resource_type');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get tenant quotas:', error);
      throw error;
    }
  }

  async getTenantUsage(tenantId: string): Promise<ResourceUsage[]> {
    try {
      const { data, error } = await supabase
        .from('tenant_resource_usage')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('resource_type');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get tenant usage:', error);
      throw error;
    }
  }

  async setTenantQuota(
    tenantId: string,
    resourceType: string,
    quotaLimit: number,
    hardLimit: boolean = true,
    warningThreshold: number = 80,
    resetPeriod: string = 'monthly'
  ): Promise<ResourceQuota> {
    try {
      const { data, error } = await supabase
        .from('tenant_resource_quotas')
        .upsert({
          tenant_id: tenantId,
          resource_type: resourceType,
          quota_limit: quotaLimit,
          hard_limit: hardLimit,
          warning_threshold: warningThreshold,
          reset_period: resetPeriod,
          effective_from: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to set tenant quota:', error);
      throw error;
    }
  }

  async getQuotaUsagePercentage(tenantId: string, resourceType: string): Promise<number> {
    try {
      const [quotas, usage] = await Promise.all([
        this.getTenantQuotas(tenantId),
        this.getTenantUsage(tenantId)
      ]);

      const quota = quotas.find(q => q.resource_type === resourceType);
      const currentUsage = usage.find(u => u.resource_type === resourceType);

      if (!quota || !currentUsage) return 0;

      return quota.quota_limit > 0 
        ? (currentUsage.current_usage / quota.quota_limit) * 100 
        : 0;
    } catch (error) {
      console.error('Failed to get quota usage percentage:', error);
      return 0;
    }
  }
}

export const tenantQuotaService = TenantQuotaService.getInstance();
