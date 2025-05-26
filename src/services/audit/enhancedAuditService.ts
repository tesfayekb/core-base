
// Enhanced Audit Service - Refactored for maintainability
// Phase 1.5: Complete Audit Foundation Implementation

import { auditEventLoggers } from './AuditEventLoggers';
import { auditEventQueue } from './AuditEventQueue';

export class EnhancedAuditService {
  private static instance: EnhancedAuditService;

  static getInstance(): EnhancedAuditService {
    if (!EnhancedAuditService.instance) {
      EnhancedAuditService.instance = new EnhancedAuditService();
    }
    return EnhancedAuditService.instance;
  }

  // Delegate to specialized loggers
  async logAuthEvent(...args: Parameters<typeof auditEventLoggers.logAuthEvent>) {
    return auditEventLoggers.logAuthEvent(...args);
  }

  async logRBACEvent(...args: Parameters<typeof auditEventLoggers.logRBACEvent>) {
    return auditEventLoggers.logRBACEvent(...args);
  }

  async logDataEvent(...args: Parameters<typeof auditEventLoggers.logDataEvent>) {
    return auditEventLoggers.logDataEvent(...args);
  }

  async logSecurityEvent(...args: Parameters<typeof auditEventLoggers.logSecurityEvent>) {
    return auditEventLoggers.logSecurityEvent(...args);
  }

  // Flush remaining events (useful for shutdown)
  async flush(): Promise<void> {
    await auditEventQueue.flush();
  }
}

export const enhancedAuditService = EnhancedAuditService.getInstance();

// Re-export types for backward compatibility
export type { AuditEvent } from './AuditEventQueue';
