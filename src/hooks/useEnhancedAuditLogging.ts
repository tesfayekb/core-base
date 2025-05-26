
// Enhanced Audit Logging Hook - Phase 2.3
// Integrates standardized audit logging with real-time monitoring

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { standardizedAuditLogger } from '@/services/audit/StandardizedAuditLogger';
import { realTimeAuditMonitor } from '@/services/audit/RealTimeAuditMonitor';

export function useEnhancedAuditLogging() {
  const { user, tenantId } = useAuth();

  const getAuditContext = useCallback(() => ({
    userId: user?.id,
    tenantId: tenantId || undefined,
    sessionId: undefined, // Would be tracked separately
    requestId: crypto.randomUUID(),
    ipAddress: undefined, // Would be set by backend
    userAgent: navigator?.userAgent
  }), [user?.id, tenantId]);

  const logStandardizedEvent = useCallback(async (
    action: string,
    resourceType: string,
    resourceId: string,
    outcome: 'success' | 'failure' | 'error',
    changes?: { before: any; after: any },
    additionalData?: Record<string, any>
  ) => {
    const context = getAuditContext();
    await standardizedAuditLogger.logStandardizedEvent(
      action,
      resourceType,
      resourceId,
      outcome,
      context,
      changes,
      additionalData
    );
  }, [getAuditContext]);

  const logTenantOperation = useCallback(async (
    operation: 'create' | 'update' | 'delete' | 'configure',
    tenantData: any,
    outcome: 'success' | 'failure' | 'error',
    changes?: { before: any; after: any }
  ) => {
    await logStandardizedEvent(
      `tenant.${operation}`,
      'tenant',
      tenantData.id || tenantId || 'unknown',
      outcome,
      changes,
      { operation, tenantData }
    );
  }, [logStandardizedEvent, tenantId]);

  const logConfigurationChange = useCallback(async (
    configurationType: string,
    configurationKey: string,
    oldValue: any,
    newValue: any,
    outcome: 'success' | 'failure' | 'error'
  ) => {
    await logStandardizedEvent(
      'configuration.update',
      'tenant_configuration',
      `${configurationType}.${configurationKey}`,
      outcome,
      { before: oldValue, after: newValue },
      { configurationType, configurationKey }
    );
  }, [logStandardizedEvent]);

  const logWorkflowEvent = useCallback(async (
    workflowType: string,
    workflowAction: string,
    workflowData: any,
    outcome: 'success' | 'failure' | 'error'
  ) => {
    await logStandardizedEvent(
      `workflow.${workflowAction}`,
      'tenant_workflow',
      workflowData.id || 'unknown',
      outcome,
      undefined,
      { workflowType, workflowAction, workflowData }
    );
  }, [logStandardizedEvent]);

  const logSecurityEvent = useCallback(async (
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>
  ) => {
    const context = getAuditContext();
    await standardizedAuditLogger.logSecurityEvent(
      eventType,
      severity,
      details,
      context
    );
  }, [getAuditContext]);

  const subscribeToAuditEvents = useCallback((callback: (event: any) => void) => {
    return realTimeAuditMonitor.subscribeToAuditEvents(callback);
  }, []);

  const generateComplianceReport = useCallback(async (
    reportType: 'daily' | 'weekly' | 'monthly'
  ) => {
    if (!tenantId) return null;
    return await realTimeAuditMonitor.generateComplianceReport(tenantId, reportType);
  }, [tenantId]);

  return {
    logStandardizedEvent,
    logTenantOperation,
    logConfigurationChange,
    logWorkflowEvent,
    logSecurityEvent,
    subscribeToAuditEvents,
    generateComplianceReport
  };
}
