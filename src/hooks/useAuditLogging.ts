
// Audit Logging Hook for UI Integration
// Phase 1.5: Authentication and RBAC Audit Integration

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { enhancedAuditService } from '@/services/audit/enhancedAuditService';

export function useAuditLogging() {
  const { user, tenantId } = useAuth();

  const getAuditContext = useCallback(() => ({
    userId: user?.id,
    tenantId: tenantId || undefined,
    ipAddress: undefined, // Would be set by backend in real implementation
    userAgent: navigator?.userAgent,
    sessionId: undefined // Would be tracked separately
  }), [user?.id, tenantId]);

  const logAuthEvent = useCallback(async (
    action: 'login' | 'logout' | 'register' | 'password_change' | 'session_expire',
    outcome: 'success' | 'failure' | 'error',
    details?: Record<string, any>
  ) => {
    const context = getAuditContext();
    await enhancedAuditService.logAuthEvent(action, outcome, user?.id, details, context);
  }, [user?.id, getAuditContext]);

  const logPermissionCheck = useCallback(async (
    resource: string,
    action: string,
    granted: boolean,
    resourceId?: string
  ) => {
    const context = getAuditContext();
    await enhancedAuditService.logRBACEvent(
      'permission_check',
      'success',
      {
        userId: user?.id,
        resource,
        permission: action,
        granted
      },
      context
    );
  }, [user?.id, getAuditContext]);

  const logRoleChange = useCallback(async (
    action: 'role_assign' | 'role_remove',
    targetUserId: string,
    roleId: string,
    outcome: 'success' | 'failure' | 'error'
  ) => {
    const context = getAuditContext();
    await enhancedAuditService.logRBACEvent(
      action,
      outcome,
      {
        userId: user?.id,
        targetUserId,
        roleId
      },
      context
    );
  }, [user?.id, getAuditContext]);

  const logDataAccess = useCallback(async (
    action: 'create' | 'read' | 'update' | 'delete',
    resourceType: string,
    resourceId: string,
    outcome: 'success' | 'failure' | 'error',
    details?: Record<string, any>
  ) => {
    const context = getAuditContext();
    await enhancedAuditService.logDataEvent(
      action,
      resourceType,
      resourceId,
      outcome,
      user?.id,
      details,
      context
    );
  }, [user?.id, getAuditContext]);

  const logSecurityEvent = useCallback(async (
    action: 'access_denied' | 'suspicious_activity' | 'breach_attempt',
    details: Record<string, any>,
    outcome: 'success' | 'failure' | 'error' = 'success'
  ) => {
    const context = getAuditContext();
    await enhancedAuditService.logSecurityEvent(action, outcome, details, context);
  }, [getAuditContext]);

  return {
    logAuthEvent,
    logPermissionCheck,
    logRoleChange,
    logDataAccess,
    logSecurityEvent
  };
}
