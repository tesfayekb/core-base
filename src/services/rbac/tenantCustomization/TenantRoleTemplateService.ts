
// Tenant-Specific Role Templates Service
// Manages role templates and custom permission sets per tenant

export interface TenantRoleTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TenantPermissionSet {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  permissions: string[];
  applicableRoles: string[];
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface TenantRBACConfiguration {
  tenantId: string;
  roleTemplates: TenantRoleTemplate[];
  customPermissionSets: TenantPermissionSet[];
  defaultRoleAssignments: Record<string, string[]>;
  permissionInheritanceRules: Record<string, string[]>;
  customizationSettings: {
    allowCustomRoles: boolean;
    allowPermissionModification: boolean;
    maxRolesPerUser: number;
    requireApprovalForRoleChanges: boolean;
  };
}

export class TenantRoleTemplateService {
  private static instance: TenantRoleTemplateService;
  private tenantConfigurations = new Map<string, TenantRBACConfiguration>();

  static getInstance(): TenantRoleTemplateService {
    if (!TenantRoleTemplateService.instance) {
      TenantRoleTemplateService.instance = new TenantRoleTemplateService();
    }
    return TenantRoleTemplateService.instance;
  }

  async getTenantRBACConfiguration(tenantId: string): Promise<TenantRBACConfiguration> {
    if (this.tenantConfigurations.has(tenantId)) {
      return this.tenantConfigurations.get(tenantId)!;
    }

    // Load from database or create default configuration
    const config = await this.loadTenantConfiguration(tenantId);
    this.tenantConfigurations.set(tenantId, config);
    return config;
  }

  async createRoleTemplate(
    tenantId: string,
    template: Omit<TenantRoleTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TenantRoleTemplate> {
    const roleTemplate: TenantRoleTemplate = {
      ...template,
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const config = await this.getTenantRBACConfiguration(tenantId);
    config.roleTemplates.push(roleTemplate);
    await this.saveTenantConfiguration(tenantId, config);

    return roleTemplate;
  }

  async createCustomPermissionSet(
    tenantId: string,
    permissionSet: Omit<TenantPermissionSet, 'id'>
  ): Promise<TenantPermissionSet> {
    const customSet: TenantPermissionSet = {
      ...permissionSet,
      id: `permset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const config = await this.getTenantRBACConfiguration(tenantId);
    config.customPermissionSets.push(customSet);
    await this.saveTenantConfiguration(tenantId, config);

    return customSet;
  }

  async applyRoleTemplate(
    tenantId: string,
    templateId: string,
    userId: string
  ): Promise<{ success: boolean; appliedPermissions: string[] }> {
    const config = await this.getTenantRBACConfiguration(tenantId);
    const template = config.roleTemplates.find(t => t.id === templateId);

    if (!template) {
      return { success: false, appliedPermissions: [] };
    }

    // Apply template permissions to user
    // This would integrate with the main RBAC service
    console.log(`Applying role template ${templateId} to user ${userId} in tenant ${tenantId}`);
    
    return {
      success: true,
      appliedPermissions: template.permissions
    };
  }

  async validateTenantCustomization(
    tenantId: string,
    customization: Partial<TenantRBACConfiguration>
  ): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    const config = await this.getTenantRBACConfiguration(tenantId);

    // Validate role templates
    if (customization.roleTemplates) {
      for (const template of customization.roleTemplates) {
        if (!template.name || template.name.trim().length === 0) {
          issues.push(`Role template missing name: ${template.id}`);
        }
        if (template.permissions.length === 0) {
          issues.push(`Role template has no permissions: ${template.name}`);
        }
      }
    }

    // Validate permission sets
    if (customization.customPermissionSets) {
      for (const permSet of customization.customPermissionSets) {
        if (permSet.permissions.length === 0) {
          issues.push(`Permission set has no permissions: ${permSet.name}`);
        }
      }
    }

    // Validate settings
    if (customization.customizationSettings) {
      const settings = customization.customizationSettings;
      if (settings.maxRolesPerUser && settings.maxRolesPerUser < 1) {
        issues.push('Max roles per user must be at least 1');
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  private async loadTenantConfiguration(tenantId: string): Promise<TenantRBACConfiguration> {
    // In a real implementation, this would load from database
    return {
      tenantId,
      roleTemplates: [],
      customPermissionSets: [],
      defaultRoleAssignments: {},
      permissionInheritanceRules: {},
      customizationSettings: {
        allowCustomRoles: true,
        allowPermissionModification: true,
        maxRolesPerUser: 5,
        requireApprovalForRoleChanges: false
      }
    };
  }

  private async saveTenantConfiguration(
    tenantId: string,
    config: TenantRBACConfiguration
  ): Promise<void> {
    this.tenantConfigurations.set(tenantId, config);
    // In a real implementation, this would save to database
    console.log(`Saved tenant configuration for ${tenantId}`);
  }
}

export const tenantRoleTemplateService = TenantRoleTemplateService.getInstance();
