import { enhancedPermissionResolver } from './EnhancedPermissionResolver';
import { entityBoundaryService } from './EntityBoundaryService';
import { dependencyValidationService } from './DependencyValidationService';
import { supabase } from '../database/connection';
import { smartCacheInvalidationService } from './SmartCacheInvalidationService';
import { cachePerformanceMonitor } from './CachePerformanceMonitor';
import { cacheWarmingService } from './CacheWarmingService';

export interface PermissionCheckRequest {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  entityId?: string;
}

export interface RoleAssignmentRequest {
  assignerId: string;
  assigneeId: string;
  roleId: string;
  entityId: string;
}

export class RBACService {
  private static instance: RBACService;

  static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  constructor() {
    // Initialize performance monitoring
    this.initializePerformanceMonitoring();
  }

  private initializePerformanceMonitoring(): void {
    // Start cache performance monitoring
    cachePerformanceMonitor.startMonitoring();
    
    // Set up scheduled cache warming
    cacheWarmingService.startScheduledWarming({
      enabled: true,
      intervalMinutes: 30, // Warm cache every 30 minutes
      strategies: ['common_permissions', 'active_users']
    });
  }

  /**
   * Check permission with entity boundary enforcement
   */
  async checkPermission(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    entityId?: string
  ): Promise<boolean> {
    try {
      // First enforce entity boundaries
      const boundaryCheck = await entityBoundaryService.enforceEntityBoundary(
        userId,
        'permission_check',
        resource,
        resourceId,
        entityId
      );

      if (!boundaryCheck.allowed) {
        console.warn('Entity boundary violation:', boundaryCheck.reason);
        return false;
      }

      // Then check the actual permission
      const result = await enhancedPermissionResolver.resolvePermission(
        userId,
        action,
        resource,
        {
          entityId: boundaryCheck.entityId,
          resourceId,
          tenantId: boundaryCheck.entityId // For backward compatibility
        }
      );

      return result.granted;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Get user roles with entity context
   */
  async getUserRoles(userId: string, entityId?: string) {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          roles (
            id,
            name,
            description
          )
        `)
        .eq('user_id', userId)
        .eq('entity_id', entityId || '');

      if (error) {
        console.error('Failed to get user roles:', error);
        return [];
      }

      // Flatten and return the roles data
      return data?.map(item => item.roles).filter(Boolean) || [];
    } catch (error) {
      console.error('Error getting user roles:', error);
      return [];
    }
  }

  /**
   * Get user permissions with entity context
   */
  async getUserPermissions(userId: string, entityId?: string) {
    try {
      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: userId,
        p_entity_id: entityId || null
      });

      if (error) {
        console.error('Failed to get user permissions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Assign role with comprehensive dependency validation
   */
  async assignRole(
    assignerId: string,
    assigneeId: string,
    roleId: string,
    entityId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Pre-validate the assignment with dependency checking
      const preValidation = await dependencyValidationService.preValidateRoleAssignment(
        assignerId,
        roleId,
        assigneeId,
        entityId
      );

      if (!preValidation.canProceed) {
        return { 
          success: false, 
          error: `Assignment blocked: ${preValidation.blockingIssues.join('; ')}` 
        };
      }

      // Log warnings if any
      if (preValidation.warnings.length > 0) {
        console.warn('Role assignment warnings:', preValidation.warnings);
      }

      // Validate entity boundary for role assignment
      const boundaryCheck = await entityBoundaryService.enforceEntityBoundary(
        assignerId,
        'assign_role',
        'roles',
        roleId,
        entityId
      );

      if (!boundaryCheck.allowed) {
        return { 
          success: false, 
          error: `Entity boundary violation: ${boundaryCheck.reason}` 
        };
      }

      // Check if assigner can grant this specific role
      const canAssignRole = await this.checkPermission(
        assignerId,
        'assign',
        'roles',
        roleId,
        entityId
      );

      if (!canAssignRole) {
        return { 
          success: false, 
          error: 'Insufficient permissions to assign this role' 
        };
      }

      // Perform the role assignment
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: assigneeId,
          role_id: roleId,
          entity_id: entityId,
          assigned_by: assignerId,
          assigned_at: new Date().toISOString()
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Smart cache invalidation for role assignment
      await smartCacheInvalidationService.invalidateUserPermissions(
        assigneeId,
        `Role ${roleId} assigned by ${assignerId}`
      );
      
      await smartCacheInvalidationService.invalidateRole(
        roleId,
        `Role assigned to user ${assigneeId}`
      );

      // Clear caches for affected users
      enhancedPermissionResolver.invalidateUserCache(assigneeId);
      enhancedPermissionResolver.invalidateUserCache(assignerId);

      return { success: true };
    } catch (error) {
      console.error('Role assignment failed:', error);
      return { success: false, error: 'Role assignment failed' };
    }
  }

  /**
   * Remove role with entity boundary validation
   */
  async removeRole(
    removerId: string,
    userId: string,
    roleId: string,
    entityId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate entity boundary for role removal
      const boundaryCheck = await entityBoundaryService.enforceEntityBoundary(
        removerId,
        'remove_role',
        'roles',
        roleId,
        entityId
      );

      if (!boundaryCheck.allowed) {
        return { 
          success: false, 
          error: `Entity boundary violation: ${boundaryCheck.reason}` 
        };
      }

      // Check if remover can remove this specific role
      const canRemoveRole = await this.checkPermission(
        removerId,
        'remove',
        'roles',
        roleId,
        entityId
      );

      if (!canRemoveRole) {
        return { 
          success: false, 
          error: 'Insufficient permissions to remove this role' 
        };
      }

      // Perform the role removal
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('entity_id', entityId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Smart cache invalidation for role removal
      await smartCacheInvalidationService.invalidateUserPermissions(
        userId,
        `Role ${roleId} removed by ${removerId}`
      );
      
      await smartCacheInvalidationService.invalidateRole(
        roleId,
        `Role removed from user ${userId}`
      );

      // Clear cache for affected user
      enhancedPermissionResolver.invalidateUserCache(userId);

      return { success: true };
    } catch (error) {
      console.error('Role removal failed:', error);
      return { success: false, error: 'Role removal failed' };
    }
  }

  /**
   * Switch user's entity context
   */
  async switchEntityContext(
    userId: string,
    newEntityId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate that user has access to the target entity
      const boundaryCheck = await entityBoundaryService.enforceEntityBoundary(
        userId,
        'switch_context',
        'entities',
        newEntityId,
        newEntityId
      );

      if (!boundaryCheck.allowed) {
        return { 
          success: false, 
          error: `Cannot switch to entity: ${boundaryCheck.reason}` 
        };
      }

      // Set the new entity context
      const success = await entityBoundaryService.setUserEntityContext(userId, newEntityId);
      
      if (!success) {
        return { success: false, error: 'Failed to switch entity context' };
      }

      return { success: true };
    } catch (error) {
      console.error('Entity context switch failed:', error);
      return { success: false, error: 'Entity context switch failed' };
    }
  }

  /**
   * Get user's available entities
   */
  async getUserEntities(userId: string) {
    return await entityBoundaryService.getUserEntityBoundaries(userId);
  }

  /**
   * Clear cache for user
   */
  clearCache(userId?: string): void {
    enhancedPermissionResolver.invalidateUserCache(userId || '');
  }

  /**
   * Get comprehensive cache performance statistics
   */
  getCachePerformanceStats(): {
    currentMetrics: any;
    isTargetMet: boolean;
    invalidationMetrics: any;
    warmingStatus: any;
    recommendations: string[];
  } {
    const currentMetrics = cachePerformanceMonitor.getCurrentMetrics();
    const isTargetMet = cachePerformanceMonitor.isPerformanceTargetMet();
    const invalidationMetrics = smartCacheInvalidationService.getInvalidationMetrics();
    const warmingStatus = cacheWarmingService.getWarmingStatus();
    const report = cachePerformanceMonitor.generatePerformanceReport();

    return {
      currentMetrics,
      isTargetMet,
      invalidationMetrics,
      warmingStatus,
      recommendations: report.recommendations
    };
  }

  /**
   * Manually trigger cache warming
   */
  async warmCache(strategies?: string[]): Promise<any[]> {
    if (strategies && strategies.length > 0) {
      const results = [];
      for (const strategy of strategies) {
        const result = await cacheWarmingService.executeWarmingStrategy(strategy);
        results.push(result);
      }
      return results;
    }
    
    return await cacheWarmingService.executeAllStrategies();
  }

  /**
   * Get active performance alerts
   */
  getPerformanceAlerts(): any[] {
    return cachePerformanceMonitor.getActiveAlerts();
  }

  /**
   * Get enhanced permission resolver stats
   */
  getPermissionStats() {
    return enhancedPermissionResolver.getPerformanceStats();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return enhancedPermissionResolver.getCacheStats();
  }
}

export const rbacService = RBACService.getInstance();
