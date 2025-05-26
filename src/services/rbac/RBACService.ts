
// RBAC Service - Main Role-Based Access Control Service
// Version: 2.0.0 - Phase 2.1 Advanced RBAC Implementation

import { supabase } from '../database';
import { PermissionCheck, EffectivePermission } from '@/types/database';

export interface RBACServiceConfig {
  cacheEnabled: boolean;
  cacheTimeout: number;
  performanceMonitoring: boolean;
}

export class RBACService {
  private static instance: RBACService;
  private config: RBACServiceConfig;
  private permissionCache = new Map<string, any>();

  private constructor(config: RBACServiceConfig = {
    cacheEnabled: true,
    cacheTimeout: 300000, // 5 minutes
    performanceMonitoring: true
  }) {
    this.config = config;
  }

  static getInstance(config?: RBACServiceConfig): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService(config);
    }
    return RBACService.instance;
  }

  async checkPermission(check: PermissionCheck): Promise<boolean> {
    const cacheKey = `${check.userId}-${check.action}-${check.resource}-${check.resourceId || 'null'}`;
    
    if (this.config.cacheEnabled && this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey);
    }

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

      const result = !!data;
      
      if (this.config.cacheEnabled) {
        this.permissionCache.set(cacheKey, result);
        setTimeout(() => this.permissionCache.delete(cacheKey), this.config.cacheTimeout);
      }

      return result;
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

  invalidateUserPermissions(userId: string): void {
    const keysToDelete = Array.from(this.permissionCache.keys())
      .filter(key => key.startsWith(`${userId}-`));
    
    keysToDelete.forEach(key => this.permissionCache.delete(key));
  }

  getCacheStats() {
    return {
      size: this.permissionCache.size,
      enabled: this.config.cacheEnabled
    };
  }
}

export const rbacService = RBACService.getInstance();
