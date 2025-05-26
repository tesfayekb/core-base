import { supabase } from '../database/connection';

export interface TenantCustomization {
  id: string;
  tenant_id: string;
  customization_type: string;
  customization_key: string;
  customization_value: any;
  inheritance_source?: string;
  is_inherited: boolean;
  validation_schema?: any;
  priority: number;
  created_at: string;
  updated_at: string;
}

export class TenantCustomizationService {
  private static instance: TenantCustomizationService;

  static getInstance(): TenantCustomizationService {
    if (!TenantCustomizationService.instance) {
      TenantCustomizationService.instance = new TenantCustomizationService();
    }
    return TenantCustomizationService.instance;
  }

  async getConfiguration(
    tenantId: string,
    configType: string,
    configKey: string
  ): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('get_tenant_configuration', {
        p_tenant_id: tenantId,
        p_config_type: configType,
        p_config_key: configKey
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get tenant configuration:', error);
      throw error;
    }
  }

  async setCustomization(
    tenantId: string,
    customizationType: string,
    customizationKey: string,
    customizationValue: any,
    validationSchema?: any
  ): Promise<TenantCustomization> {
    try {
      const { data, error } = await supabase
        .from('tenant_customizations')
        .upsert({
          tenant_id: tenantId,
          customization_type: customizationType,
          customization_key: customizationKey,
          customization_value: customizationValue,
          validation_schema: validationSchema,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to set tenant customization:', error);
      throw error;
    }
  }

  async getCustomizations(
    tenantId: string,
    customizationType?: string
  ): Promise<TenantCustomization[]> {
    try {
      let query = supabase
        .from('tenant_customizations')
        .select('*')
        .eq('tenant_id', tenantId);

      if (customizationType) {
        query = query.eq('customization_type', customizationType);
      }

      const { data, error } = await query.order('customization_type', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get tenant customizations:', error);
      throw error;
    }
  }

  async getBrandingConfiguration(tenantId: string): Promise<any> {
    try {
      const customizations = await this.getCustomizations(tenantId, 'branding');
      
      const brandingConfig: any = {};
      customizations.forEach(custom => {
        brandingConfig[custom.customization_key] = custom.customization_value;
      });

      return {
        logo: brandingConfig.logo || '',
        primaryColor: brandingConfig.primaryColor || '#3b82f6',
        secondaryColor: brandingConfig.secondaryColor || '#64748b',
        companyName: brandingConfig.companyName || '',
        favicon: brandingConfig.favicon || '',
        ...brandingConfig
      };
    } catch (error) {
      console.error('Failed to get branding configuration:', error);
      return {
        logo: '',
        primaryColor: '#3b82f6',
        secondaryColor: '#64748b'
      };
    }
  }

  async setBrandingConfiguration(
    tenantId: string,
    branding: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
      companyName?: string;
      favicon?: string;
    }
  ): Promise<void> {
    try {
      const promises = Object.entries(branding).map(([key, value]) =>
        this.setCustomization(tenantId, 'branding', key, value)
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to set branding configuration:', error);
      throw error;
    }
  }

  async deleteCustomization(tenantId: string, customizationType: string, customizationKey: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tenant_customizations')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('customization_type', customizationType)
        .eq('customization_key', customizationKey);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete tenant customization:', error);
      throw error;
    }
  }
}

export const tenantCustomizationService = TenantCustomizationService.getInstance();
