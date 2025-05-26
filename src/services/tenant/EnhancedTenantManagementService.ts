
import { tenantManagementService } from './TenantManagementService';
import { tenantQuotaService } from './TenantQuotaService';
import { tenantCustomizationService } from './TenantCustomizationService';
import { tenantWorkflowService } from './TenantWorkflowService';
import { tenantConfigurationService } from './TenantConfigurationService';

export interface EnhancedTenantConfig {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: string;
  settings: any;
  customizations: any;
  quotas: any[];
  usage: any[];
  workflows: any[];
  created_at: string;
  updated_at: string;
}

export class EnhancedTenantManagementService {
  private static instance: EnhancedTenantManagementService;

  static getInstance(): EnhancedTenantManagementService {
    if (!EnhancedTenantManagementService.instance) {
      EnhancedTenantManagementService.instance = new EnhancedTenantManagementService();
    }
    return EnhancedTenantManagementService.instance;
  }

  async getEnhancedTenant(tenantId: string): Promise<EnhancedTenantConfig | null> {
    try {
      // Get base tenant information
      const tenant = await tenantManagementService.getTenant(tenantId);
      if (!tenant) return null;

      // Get enhanced data in parallel
      const [customizations, quotas, usage, workflows] = await Promise.all([
        tenantCustomizationService.getCustomizations(tenantId),
        tenantQuotaService.getTenantQuotas(tenantId),
        tenantQuotaService.getTenantUsage(tenantId),
        tenantWorkflowService.getWorkflows(tenantId)
      ]);

      return {
        ...tenant,
        customizations: this.groupCustomizations(customizations),
        quotas,
        usage,
        workflows,
        created_at: tenant.createdAt.toISOString(),
        updated_at: tenant.updatedAt.toISOString()
      };
    } catch (error) {
      console.error('Failed to get enhanced tenant:', error);
      throw error;
    }
  }

  private groupCustomizations(customizations: any[]): any {
    const grouped: any = {};
    customizations.forEach(custom => {
      if (!grouped[custom.customization_type]) {
        grouped[custom.customization_type] = {};
      }
      grouped[custom.customization_type][custom.customization_key] = custom.customization_value;
    });
    return grouped;
  }

  async provisionTenant(
    name: string,
    slug: string,
    domain?: string,
    initialConfig: any = {}
  ): Promise<EnhancedTenantConfig> {
    try {
      // Create base tenant
      const tenant = await tenantManagementService.createTenant(name, slug, initialConfig, domain);
      
      // Set up default quotas
      const defaultQuotas = [
        { resourceType: 'users', limit: 100 },
        { resourceType: 'storage_mb', limit: 1000 },
        { resourceType: 'api_calls_monthly', limit: 10000 }
      ];

      for (const quota of defaultQuotas) {
        await tenantQuotaService.setTenantQuota(
          tenant.id,
          quota.resourceType,
          quota.limit
        );
      }

      // Set up default workflows
      await tenantWorkflowService.createWorkflow(
        tenant.id,
        'user_onboarding',
        'user_onboarding',
        {
          send_welcome_email: true,
          assign_default_role: 'user',
          require_email_verification: true
        },
        ['user_created'],
        [
          { step: 'send_welcome_email', order: 1 },
          { step: 'assign_default_role', order: 2 },
          { step: 'send_verification_email', order: 3 }
        ]
      );

      // Create initial backup
      await tenantConfigurationService.backupConfiguration(
        tenant.id,
        'Initial tenant provisioning'
      );

      return this.getEnhancedTenant(tenant.id) as Promise<EnhancedTenantConfig>;
    } catch (error) {
      console.error('Failed to provision tenant:', error);
      throw error;
    }
  }

  async validateResourceUsage(
    tenantId: string,
    resourceType: string,
    increment: number = 1
  ): Promise<boolean> {
    try {
      const result = await tenantQuotaService.validateQuota(
        tenantId,
        resourceType,
        increment,
        true // check only
      );
      return result.allowed;
    } catch (error) {
      console.error('Failed to validate resource usage:', error);
      return false;
    }
  }

  async getTenantDashboardData(tenantId: string): Promise<any> {
    try {
      const [tenant, quotas, usage] = await Promise.all([
        tenantManagementService.getTenant(tenantId),
        tenantQuotaService.getTenantQuotas(tenantId),
        tenantQuotaService.getTenantUsage(tenantId)
      ]);

      const quotaUsage = quotas.map(quota => {
        const currentUsage = usage.find(u => u.resource_type === quota.resource_type);
        const usagePercentage = quota.quota_limit > 0 
          ? ((currentUsage?.current_usage || 0) / quota.quota_limit) * 100 
          : 0;

        return {
          resource_type: quota.resource_type,
          current_usage: currentUsage?.current_usage || 0,
          quota_limit: quota.quota_limit,
          usage_percentage: usagePercentage,
          warning: usagePercentage >= quota.warning_threshold,
          hard_limit: quota.hard_limit
        };
      });

      return {
        tenant,
        quotaUsage,
        totalQuotas: quotas.length,
        warningQuotas: quotaUsage.filter(q => q.warning).length
      };
    } catch (error) {
      console.error('Failed to get tenant dashboard data:', error);
      throw error;
    }
  }
}

export const enhancedTenantManagementService = EnhancedTenantManagementService.getInstance();
