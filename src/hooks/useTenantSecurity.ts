
// Tenant Security Hook - UI Integration for Multi-Tenant Security
// Phase 1.6: Multi-Tenant Foundation Security Integration

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { tenantSecurityService, TenantAccessContext } from '@/services/security/tenantSecurityService';
import { useSecureErrorNotification } from './useSecureErrorNotification';

export function useTenantSecurity() {
  const { user, tenantId } = useAuth();
  const { handleSuspiciousActivity, handlePermissionError } = useSecureErrorNotification();
  const [isValidating, setIsValidating] = useState(false);

  const validateTenantAccess = useCallback(async (
    requestedTenantId: string,
    operation: string,
    resourceType?: string,
    resourceId?: string
  ) => {
    if (!user) {
      return { allowed: false, reason: 'User not authenticated' };
    }

    setIsValidating(true);
    
    try {
      const context: TenantAccessContext = {
        userId: user.id,
        requestedTenantId,
        currentTenantId: tenantId || undefined,
        operation,
        resourceType,
        resourceId
      };

      const result = await tenantSecurityService.validateTenantAccess(context);
      
      if (!result.allowed && result.securityViolation) {
        await handleSuspiciousActivity(
          new Error(`Tenant access violation: ${result.reason}`),
          `tenant_access:${operation}`
        );
      }

      return result;
    } catch (error) {
      console.error('Tenant access validation error:', error);
      return { 
        allowed: false, 
        reason: 'Validation failed',
        securityViolation: true
      };
    } finally {
      setIsValidating(false);
    }
  }, [user, tenantId, handleSuspiciousActivity]);

  const validateTenantSwitch = useCallback(async (targetTenantId: string) => {
    if (!user) {
      return { allowed: false, reason: 'User not authenticated' };
    }

    setIsValidating(true);

    try {
      const result = await tenantSecurityService.validateTenantSwitch(
        user.id,
        tenantId,
        targetTenantId
      );

      if (!result.allowed && result.securityViolation) {
        await handleSuspiciousActivity(
          new Error(`Tenant switch violation: ${result.reason}`),
          'tenant_switch'
        );
      }

      if (!result.allowed && !result.securityViolation) {
        await handlePermissionError(
          new Error(`Tenant switch denied: ${result.reason}`),
          'tenant',
          'switch'
        );
      }

      return result;
    } catch (error) {
      console.error('Tenant switch validation error:', error);
      return {
        allowed: false,
        reason: 'Switch validation failed',
        securityViolation: true
      };
    } finally {
      setIsValidating(false);
    }
  }, [user, tenantId, handleSuspiciousActivity, handlePermissionError]);

  const enforceDataIsolation = useCallback(async (
    query: string,
    parameters: any[] = []
  ) => {
    if (!user || !tenantId) {
      return { 
        allowed: false, 
        reason: 'User or tenant context missing' 
      };
    }

    try {
      return await tenantSecurityService.enforceDataIsolation(
        user.id,
        tenantId,
        query,
        parameters
      );
    } catch (error) {
      console.error('Data isolation enforcement error:', error);
      return {
        allowed: false,
        reason: 'Data isolation enforcement failed'
      };
    }
  }, [user, tenantId]);

  return {
    validateTenantAccess,
    validateTenantSwitch,
    enforceDataIsolation,
    isValidating
  };
}
