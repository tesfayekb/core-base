
import { supabase } from '@/integrations/supabase/client';

export interface ConfigurationBackup {
  id: string;
  tenant_id: string;
  configuration_type: string;
  configuration_snapshot: any;
  change_type: string;
  change_description?: string;
  previous_values?: any;
  created_at: string;
  created_by?: string;
}

export class TenantConfigurationService {
  private static instance: TenantConfigurationService;

  static getInstance(): TenantConfigurationService {
    if (!TenantConfigurationService.instance) {
      TenantConfigurationService.instance = new TenantConfigurationService();
    }
    return TenantConfigurationService.instance;
  }

  async backupConfiguration(
    tenantId: string,
    description: string = 'Manual backup'
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('backup_tenant_configuration', {
        p_tenant_id: tenantId,
        p_backup_description: description
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to backup tenant configuration:', error);
      throw error;
    }
  }

  async getConfigurationHistory(
    tenantId: string,
    configurationType?: string
  ): Promise<ConfigurationBackup[]> {
    try {
      let query = supabase
        .from('tenant_configuration_history')
        .select('*')
        .eq('tenant_id', tenantId);

      if (configurationType) {
        query = query.eq('configuration_type', configurationType);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get configuration history:', error);
      throw error;
    }
  }

  async restoreConfiguration(
    tenantId: string,
    backupId: string
  ): Promise<void> {
    try {
      // Get the backup
      const { data: backup, error: backupError } = await supabase
        .from('tenant_configuration_history')
        .select('*')
        .eq('id', backupId)
        .eq('tenant_id', tenantId)
        .single();

      if (backupError) throw backupError;

      const snapshot = backup.configuration_snapshot;

      // Restore tenant settings
      if (snapshot.tenant_settings) {
        const { error: tenantError } = await supabase
          .from('tenants')
          .update({ settings: snapshot.tenant_settings })
          .eq('id', tenantId);

        if (tenantError) throw tenantError;
      }

      // Restore customizations
      if (snapshot.customizations) {
        // Delete existing customizations
        await supabase
          .from('tenant_customizations')
          .delete()
          .eq('tenant_id', tenantId);

        // Insert restored customizations
        const customizations = snapshot.customizations.map((custom: any) => ({
          tenant_id: tenantId,
          customization_type: custom.type,
          customization_key: custom.key,
          customization_value: custom.value
        }));

        if (customizations.length > 0) {
          const { error: customError } = await supabase
            .from('tenant_customizations')
            .insert(customizations);

          if (customError) throw customError;
        }
      }

      // Record restore action
      await supabase
        .from('tenant_configuration_history')
        .insert({
          tenant_id: tenantId,
          configuration_type: 'restore',
          configuration_snapshot: { restored_from: backupId },
          change_type: 'restore',
          change_description: `Restored from backup ${backupId}`
        });

    } catch (error) {
      console.error('Failed to restore tenant configuration:', error);
      throw error;
    }
  }

  async exportConfiguration(tenantId: string): Promise<any> {
    try {
      // Create a comprehensive backup
      const backupId = await this.backupConfiguration(tenantId, 'Export configuration');
      
      // Get the backup data
      const { data, error } = await supabase
        .from('tenant_configuration_history')
        .select('configuration_snapshot')
        .eq('id', backupId)
        .single();

      if (error) throw error;
      return data.configuration_snapshot;
    } catch (error) {
      console.error('Failed to export tenant configuration:', error);
      throw error;
    }
  }
}

export const tenantConfigurationService = TenantConfigurationService.getInstance();
