
// Permission Management Service
// Version: 1.0.0
// Phase 1.2: Database Foundation - Permission System

import { supabase } from './connection';
import { PermissionCheck, EffectivePermission } from '@/types/database';

export class PermissionService {
  private static instance: PermissionService;

  static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  async checkPermission(check: PermissionCheck): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: check.userId,
        p_action: check.action,
        p_resource: check.resource,
        p_resource_id: check.resourceId || null
      });

      if (error) {
        console.error('Permission check error:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  async getUserPermissions(userId: string): Promise<EffectivePermission[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: userId
      });

      if (error) {
        console.error('Get user permissions error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get user permissions failed:', error);
      return [];
    }
  }

  async batchCheckPermissions(checks: PermissionCheck[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    // Execute checks in parallel for better performance
    const promises = checks.map(async (check) => {
      const key = `${check.userId}-${check.action}-${check.resource}-${check.resourceId || 'null'}`;
      const result = await this.checkPermission(check);
      return { key, result };
    });

    const resolvedChecks = await Promise.all(promises);
    
    resolvedChecks.forEach(({ key, result }) => {
      results[key] = result;
    });

    return results;
  }
}

export const permissionService = PermissionService.getInstance();
