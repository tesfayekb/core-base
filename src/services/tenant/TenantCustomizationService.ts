
// Tenant Customization Service
// Version: 1.0.0 - Tenant-Specific Customizations

export interface TenantTheme {
  id: string;
  tenantId: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
    };
  };
  logo?: string;
  favicon?: string;
  customCss?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantFeatureFlag {
  id: string;
  tenantId: string;
  key: string;
  value: boolean | string | number;
  description?: string;
  category: 'ui' | 'functionality' | 'integration' | 'performance';
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantCustomField {
  id: string;
  tenantId: string;
  entityType: string; // 'user', 'project', 'task', etc.
  fieldName: string;
  fieldType: 'text' | 'number' | 'boolean' | 'select' | 'date' | 'email';
  label: string;
  required: boolean;
  options?: string[]; // For select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class TenantCustomizationService {
  private static instance: TenantCustomizationService;

  static getInstance(): TenantCustomizationService {
    if (!TenantCustomizationService.instance) {
      TenantCustomizationService.instance = new TenantCustomizationService();
    }
    return TenantCustomizationService.instance;
  }

  // Theme Management
  async getTenantTheme(tenantId: string): Promise<TenantTheme | null> {
    try {
      // Mock implementation - in production, this would fetch from database
      return {
        id: `theme-${tenantId}`,
        tenantId,
        name: 'Default Theme',
        colors: {
          primary: '#0f172a',
          secondary: '#64748b',
          accent: '#3b82f6',
          background: '#ffffff',
          foreground: '#0f172a'
        },
        typography: {
          fontFamily: 'Inter, sans-serif',
          fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem'
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Failed to get tenant theme:', error);
      return null;
    }
  }

  async updateTenantTheme(theme: Partial<TenantTheme> & { tenantId: string }): Promise<TenantTheme | null> {
    try {
      // Mock implementation - in production, this would update database
      const existingTheme = await this.getTenantTheme(theme.tenantId);
      if (!existingTheme) return null;

      const updatedTheme: TenantTheme = {
        ...existingTheme,
        ...theme,
        updatedAt: new Date()
      };

      console.log('Theme updated:', updatedTheme);
      return updatedTheme;
    } catch (error) {
      console.error('Failed to update tenant theme:', error);
      return null;
    }
  }

  // Feature Flag Management
  async getTenantFeatureFlags(tenantId: string): Promise<TenantFeatureFlag[]> {
    try {
      // Mock implementation - in production, this would fetch from database
      return [
        {
          id: `flag-1-${tenantId}`,
          tenantId,
          key: 'advanced_dashboard',
          value: true,
          description: 'Enable advanced dashboard features',
          category: 'ui',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: `flag-2-${tenantId}`,
          tenantId,
          key: 'api_rate_limit',
          value: 1000,
          description: 'API requests per hour limit',
          category: 'performance',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
    } catch (error) {
      console.error('Failed to get tenant feature flags:', error);
      return [];
    }
  }

  async updateFeatureFlag(
    tenantId: string, 
    key: string, 
    value: boolean | string | number,
    description?: string
  ): Promise<boolean> {
    try {
      // Mock implementation - in production, this would update database
      console.log(`Feature flag updated: ${key} = ${value} for tenant ${tenantId}`);
      return true;
    } catch (error) {
      console.error('Failed to update feature flag:', error);
      return false;
    }
  }

  async getFeatureFlagValue(tenantId: string, key: string): Promise<boolean | string | number | null> {
    try {
      const flags = await this.getTenantFeatureFlags(tenantId);
      const flag = flags.find(f => f.key === key);
      return flag?.value || null;
    } catch (error) {
      console.error('Failed to get feature flag value:', error);
      return null;
    }
  }

  // Custom Fields Management
  async getTenantCustomFields(tenantId: string, entityType?: string): Promise<TenantCustomField[]> {
    try {
      // Mock implementation - in production, this would fetch from database
      const allFields: TenantCustomField[] = [
        {
          id: `field-1-${tenantId}`,
          tenantId,
          entityType: 'user',
          fieldName: 'department',
          fieldType: 'select',
          label: 'Department',
          required: false,
          options: ['Engineering', 'Sales', 'Marketing', 'Support'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: `field-2-${tenantId}`,
          tenantId,
          entityType: 'user',
          fieldName: 'employee_id',
          fieldType: 'text',
          label: 'Employee ID',
          required: true,
          validation: { pattern: '^[A-Z]{2}[0-9]{4}$' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      return entityType 
        ? allFields.filter(field => field.entityType === entityType)
        : allFields;
    } catch (error) {
      console.error('Failed to get tenant custom fields:', error);
      return [];
    }
  }

  async createCustomField(field: Omit<TenantCustomField, 'id' | 'createdAt' | 'updatedAt'>): Promise<TenantCustomField | null> {
    try {
      // Mock implementation - in production, this would create in database
      const newField: TenantCustomField = {
        ...field,
        id: `field-${Date.now()}-${field.tenantId}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Custom field created:', newField);
      return newField;
    } catch (error) {
      console.error('Failed to create custom field:', error);
      return null;
    }
  }

  async updateCustomField(
    fieldId: string, 
    updates: Partial<Omit<TenantCustomField, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>
  ): Promise<TenantCustomField | null> {
    try {
      // Mock implementation - in production, this would update database
      console.log(`Custom field ${fieldId} updated:`, updates);
      return null; // Would return updated field
    } catch (error) {
      console.error('Failed to update custom field:', error);
      return null;
    }
  }

  async deleteCustomField(fieldId: string): Promise<boolean> {
    try {
      // Mock implementation - in production, this would delete from database
      console.log(`Custom field ${fieldId} deleted`);
      return true;
    } catch (error) {
      console.error('Failed to delete custom field:', error);
      return false;
    }
  }

  // Configuration Management
  async getTenantConfiguration(tenantId: string): Promise<Record<string, any>> {
    try {
      // Mock implementation - in production, this would fetch from database
      return {
        notifications: {
          email: true,
          inApp: true,
          slack: false
        },
        security: {
          mfaRequired: false,
          sessionTimeout: 8, // hours
          passwordPolicy: 'medium'
        },
        integrations: {
          enabled: ['slack', 'github'],
          apiKeys: {}
        },
        billing: {
          plan: 'professional',
          features: ['advanced_analytics', 'custom_branding']
        }
      };
    } catch (error) {
      console.error('Failed to get tenant configuration:', error);
      return {};
    }
  }

  async updateTenantConfiguration(
    tenantId: string, 
    configuration: Record<string, any>
  ): Promise<boolean> {
    try {
      // Mock implementation - in production, this would update database
      console.log(`Configuration updated for tenant ${tenantId}:`, configuration);
      return true;
    } catch (error) {
      console.error('Failed to update tenant configuration:', error);
      return false;
    }
  }

  // Utility Methods
  async applyTenantTheme(tenantId: string): Promise<void> {
    const theme = await this.getTenantTheme(tenantId);
    if (!theme) return;

    // Apply theme to document root
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Apply typography
    root.style.setProperty('--font-family', theme.typography.fontFamily);
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });

    // Apply custom CSS if available
    if (theme.customCss) {
      let styleElement = document.getElementById('tenant-custom-styles');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'tenant-custom-styles';
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = theme.customCss;
    }
  }

  async validateCustomField(field: TenantCustomField, value: any): Promise<{ valid: boolean; error?: string }> {
    try {
      // Basic type validation
      switch (field.fieldType) {
        case 'text':
        case 'email':
          if (typeof value !== 'string') {
            return { valid: false, error: 'Value must be a string' };
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            return { valid: false, error: 'Value must be a number' };
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            return { valid: false, error: 'Value must be a boolean' };
          }
          break;
        case 'select':
          if (!field.options?.includes(value)) {
            return { valid: false, error: 'Value must be one of the allowed options' };
          }
          break;
      }

      // Required field validation
      if (field.required && (value === null || value === undefined || value === '')) {
        return { valid: false, error: 'This field is required' };
      }

      // Additional validation based on field type and rules
      if (field.validation) {
        if (field.validation.min !== undefined && value < field.validation.min) {
          return { valid: false, error: `Value must be at least ${field.validation.min}` };
        }
        if (field.validation.max !== undefined && value > field.validation.max) {
          return { valid: false, error: `Value must be at most ${field.validation.max}` };
        }
        if (field.validation.pattern && typeof value === 'string') {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            return { valid: false, error: 'Value does not match the required pattern' };
          }
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('Field validation error:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }
}

export const tenantCustomizationService = TenantCustomizationService.getInstance();
