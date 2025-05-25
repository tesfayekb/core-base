
// Configuration Management Service
// Dynamic feature definitions and tenant-specific configuration

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  tenantSpecific: boolean;
  dependencies: string[];
  metadata: Record<string, any>;
}

export interface TenantConfiguration {
  tenantId: string;
  features: Record<string, boolean>;
  customSettings: Record<string, any>;
  restrictions: string[];
  auditLevel: 'basic' | 'detailed' | 'comprehensive';
  lastUpdated: Date;
}

class ConfigurationManagerService {
  private static instance: ConfigurationManagerService;
  private featureDefinitions: Map<string, FeatureDefinition> = new Map();
  private tenantConfigurations: Map<string, TenantConfiguration> = new Map();

  static getInstance(): ConfigurationManagerService {
    if (!ConfigurationManagerService.instance) {
      ConfigurationManagerService.instance = new ConfigurationManagerService();
      ConfigurationManagerService.instance.loadDefaultFeatures();
    }
    return ConfigurationManagerService.instance;
  }

  private loadDefaultFeatures(): void {
    const defaultFeatures: FeatureDefinition[] = [
      {
        id: 'audit_trail',
        name: 'Audit Trail',
        description: 'Comprehensive audit logging',
        enabled: true,
        tenantSpecific: true,
        dependencies: [],
        metadata: { category: 'security' }
      },
      {
        id: 'metrics_collection',
        name: 'Metrics Collection',
        description: 'Performance and usage metrics',
        enabled: true,
        tenantSpecific: true,
        dependencies: [],
        metadata: { category: 'monitoring' }
      },
      {
        id: 'real_time_updates',
        name: 'Real-time Updates',
        description: 'Live context updates',
        enabled: true,
        tenantSpecific: false,
        dependencies: ['file_watcher'],
        metadata: { category: 'performance' }
      },
      {
        id: 'advanced_rbac',
        name: 'Advanced RBAC',
        description: 'Enhanced role-based access control',
        enabled: true,
        tenantSpecific: true,
        dependencies: ['rbac_foundation'],
        metadata: { category: 'security' }
      },
      {
        id: 'multi_tenant_isolation',
        name: 'Multi-tenant Isolation',
        description: 'Complete tenant data separation',
        enabled: true,
        tenantSpecific: false,
        dependencies: ['database_setup'],
        metadata: { category: 'architecture' }
      }
    ];

    defaultFeatures.forEach(feature => {
      this.featureDefinitions.set(feature.id, feature);
    });

    console.log('📋 Default feature definitions loaded');
  }

  getFeatureDefinition(featureId: string): FeatureDefinition | null {
    return this.featureDefinitions.get(featureId) || null;
  }

  getAllFeatures(): FeatureDefinition[] {
    return Array.from(this.featureDefinitions.values());
  }

  isFeatureEnabled(featureId: string, tenantId?: string): boolean {
    const feature = this.featureDefinitions.get(featureId);
    if (!feature) return false;

    if (!feature.tenantSpecific) {
      return feature.enabled;
    }

    if (!tenantId) return feature.enabled;

    const tenantConfig = this.tenantConfigurations.get(tenantId);
    if (!tenantConfig) return feature.enabled;

    return tenantConfig.features[featureId] ?? feature.enabled;
  }

  updateFeatureDefinition(feature: Partial<FeatureDefinition> & { id: string }): void {
    const existing = this.featureDefinitions.get(feature.id);
    if (existing) {
      this.featureDefinitions.set(feature.id, { ...existing, ...feature });
    } else {
      this.featureDefinitions.set(feature.id, feature as FeatureDefinition);
    }

    console.log(`📝 Feature definition updated: ${feature.id}`);
  }

  getTenantConfiguration(tenantId: string): TenantConfiguration | null {
    return this.tenantConfigurations.get(tenantId) || null;
  }

  updateTenantConfiguration(
    tenantId: string, 
    config: Partial<TenantConfiguration>
  ): void {
    const existing = this.tenantConfigurations.get(tenantId) || {
      tenantId,
      features: {},
      customSettings: {},
      restrictions: [],
      auditLevel: 'basic' as const,
      lastUpdated: new Date()
    };

    const updated = {
      ...existing,
      ...config,
      tenantId,
      lastUpdated: new Date()
    };

    this.tenantConfigurations.set(tenantId, updated);
    console.log(`⚙️ Tenant configuration updated: ${tenantId}`);
  }

  getEnabledFeatures(tenantId?: string): string[] {
    return Array.from(this.featureDefinitions.values())
      .filter(feature => this.isFeatureEnabled(feature.id, tenantId))
      .map(feature => feature.id);
  }

  validateFeatureDependencies(featureId: string, tenantId?: string): {
    valid: boolean;
    missingDependencies: string[];
  } {
    const feature = this.featureDefinitions.get(featureId);
    if (!feature) {
      return { valid: false, missingDependencies: [] };
    }

    const missingDependencies = feature.dependencies.filter(
      depId => !this.isFeatureEnabled(depId, tenantId)
    );

    return {
      valid: missingDependencies.length === 0,
      missingDependencies
    };
  }

  getFeaturesByCategory(category: string): FeatureDefinition[] {
    return Array.from(this.featureDefinitions.values())
      .filter(feature => feature.metadata.category === category);
  }

  exportConfiguration(tenantId?: string): Record<string, any> {
    if (tenantId) {
      return {
        tenant: this.tenantConfigurations.get(tenantId),
        enabledFeatures: this.getEnabledFeatures(tenantId)
      };
    }

    return {
      features: Array.from(this.featureDefinitions.values()),
      tenants: Array.from(this.tenantConfigurations.values())
    };
  }

  importConfiguration(config: Record<string, any>): void {
    if (config.features) {
      config.features.forEach((feature: FeatureDefinition) => {
        this.featureDefinitions.set(feature.id, feature);
      });
    }

    if (config.tenants) {
      config.tenants.forEach((tenant: TenantConfiguration) => {
        this.tenantConfigurations.set(tenant.tenantId, tenant);
      });
    }

    console.log('📦 Configuration imported successfully');
  }
}

export const configurationManager = ConfigurationManagerService.getInstance();
