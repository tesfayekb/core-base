
import { supabase } from '../database/connection';

export interface TenantWorkflow {
  id: string;
  tenant_id: string;
  workflow_name: string;
  workflow_type: string;
  workflow_config: any;
  trigger_events: string[];
  workflow_steps: any[];
  conditions: any;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export class TenantWorkflowService {
  private static instance: TenantWorkflowService;

  static getInstance(): TenantWorkflowService {
    if (!TenantWorkflowService.instance) {
      TenantWorkflowService.instance = new TenantWorkflowService();
    }
    return TenantWorkflowService.instance;
  }

  private validateTenantId(tenantId: string): boolean {
    // Check if tenantId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(tenantId);
  }

  async getWorkflows(tenantId: string): Promise<TenantWorkflow[]> {
    try {
      if (!this.validateTenantId(tenantId)) {
        console.warn('Invalid tenant ID provided, returning empty workflows');
        return [];
      }

      const { data, error } = await supabase
        .from('tenant_workflows')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('workflow_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get tenant workflows:', error);
      throw error;
    }
  }

  async getWorkflow(tenantId: string, workflowName: string): Promise<TenantWorkflow | null> {
    try {
      if (!this.validateTenantId(tenantId)) {
        console.warn('Invalid tenant ID provided, returning null workflow');
        return null;
      }

      const { data, error } = await supabase
        .from('tenant_workflows')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('workflow_name', workflowName)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Failed to get tenant workflow:', error);
      return null;
    }
  }

  async createWorkflow(
    tenantId: string,
    workflowName: string,
    workflowType: string,
    workflowConfig: any,
    triggerEvents: string[] = [],
    workflowSteps: any[] = [],
    conditions: any = {}
  ): Promise<TenantWorkflow> {
    try {
      if (!this.validateTenantId(tenantId)) {
        throw new Error('Invalid tenant ID provided');
      }

      const { data, error } = await supabase
        .from('tenant_workflows')
        .insert({
          tenant_id: tenantId,
          workflow_name: workflowName,
          workflow_type: workflowType,
          workflow_config: workflowConfig,
          trigger_events: triggerEvents,
          workflow_steps: workflowSteps,
          conditions: conditions,
          is_active: true,
          version: 1
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to create tenant workflow:', error);
      throw error;
    }
  }

  async updateWorkflow(
    tenantId: string,
    workflowId: string,
    updates: Partial<TenantWorkflow>
  ): Promise<TenantWorkflow> {
    try {
      if (!this.validateTenantId(tenantId)) {
        throw new Error('Invalid tenant ID provided');
      }

      const { data, error } = await supabase
        .from('tenant_workflows')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to update tenant workflow:', error);
      throw error;
    }
  }

  async executeWorkflow(
    tenantId: string,
    workflowName: string,
    triggerData: any = {}
  ): Promise<string> {
    try {
      if (!this.validateTenantId(tenantId)) {
        throw new Error('Invalid tenant ID provided');
      }

      const { data, error } = await supabase.rpc('execute_tenant_workflow', {
        p_tenant_id: tenantId,
        p_workflow_name: workflowName,
        p_trigger_data: triggerData
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to execute tenant workflow:', error);
      throw error;
    }
  }

  async toggleWorkflow(tenantId: string, workflowId: string, isActive: boolean): Promise<TenantWorkflow> {
    return this.updateWorkflow(tenantId, workflowId, { is_active: isActive });
  }

  async deleteWorkflow(tenantId: string, workflowId: string): Promise<void> {
    try {
      if (!this.validateTenantId(tenantId)) {
        throw new Error('Invalid tenant ID provided');
      }

      const { error } = await supabase
        .from('tenant_workflows')
        .delete()
        .eq('id', workflowId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete tenant workflow:', error);
      throw error;
    }
  }
}

export const tenantWorkflowService = TenantWorkflowService.getInstance();
