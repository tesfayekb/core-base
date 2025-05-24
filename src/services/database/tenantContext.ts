
import { supabase } from './index';

export class TenantContextService {
  private currentTenantId: string | null = null;

  async setUserContext(userId: string): Promise<void> {
    try {
      // Get user's default tenant or first tenant
      const { data: userTenants, error } = await supabase
        .from('user_roles')
        .select('tenant_id, tenants(id, name, slug)')
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        console.error('Failed to get user tenant context:', error);
        return;
      }

      if (userTenants && userTenants.length > 0) {
        const tenantId = userTenants[0].tenant_id;
        await this.setTenantContext(tenantId);
        this.currentTenantId = tenantId;
      }
    } catch (error) {
      console.error('Error setting user context:', error);
    }
  }

  async setTenantContext(tenantId: string): Promise<void> {
    const { error } = await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
    if (error) {
      console.error('Failed to set tenant context:', error);
      throw error;
    }
    this.currentTenantId = tenantId;
  }

  getCurrentTenantId(): string | null {
    return this.currentTenantId;
  }

  clearContext(): void {
    this.currentTenantId = null;
  }

  async switchTenantContext(userId: string, tenantId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify user has access to this tenant
      const { data: access, error: accessError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (accessError || !access) {
        return { success: false, error: 'No access to specified tenant' };
      }

      // Set the new tenant context
      await this.setTenantContext(tenantId);
      return { success: true };

    } catch (error) {
      console.error('Error switching tenant context:', error);
      return { success: false, error: 'Failed to switch tenant context' };
    }
  }
}

export const tenantContextService = new TenantContextService();
