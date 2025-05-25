interface AuditEvent {
  eventType: string;
  userId: string;
  tenantId?: string;
  resource?: string;
  action?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
  ipAddress?: string;
  userAgent?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface StandardizedLogEntry {
  id: string;
  timestamp: string;
  eventType: string;
  userId: string;
  tenantId?: string;
  resource?: string;
  action?: string;
  severity: string;
  metadata: Record<string, any>;
  context: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
}

export class AuditLoggingService {
  private static instance: AuditLoggingService;
  private logQueue: StandardizedLogEntry[] = [];
  private readonly batchSize = 10;
  private readonly flushInterval = 5000; // 5 seconds

  static getInstance(): AuditLoggingService {
    if (!AuditLoggingService.instance) {
      AuditLoggingService.instance = new AuditLoggingService();
    }
    return AuditLoggingService.instance;
  }

  private constructor() {
    this.startBatchProcessor();
  }

  // Core audit logging method
  async logEvent(event: AuditEvent): Promise<void> {
    try {
      const standardizedEntry = this.formatStandardLog(event);
      
      // Add to queue for batch processing
      this.logQueue.push(standardizedEntry);
      
      // Immediate flush for critical events
      if (event.severity === 'critical') {
        await this.flushLogs();
      }
      
      // Auto-flush if queue is full
      if (this.logQueue.length >= this.batchSize) {
        await this.flushLogs();
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  // Authentication events
  async logAuthenticationEvent(type: 'login' | 'logout' | 'failed_login', userId: string, metadata: Record<string, any> = {}): Promise<void> {
    await this.logEvent({
      eventType: `auth.${type}`,
      userId,
      action: type,
      resource: 'authentication',
      severity: type === 'failed_login' ? 'warning' : 'info',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Permission events
  async logPermissionEvent(action: string, resource: string, userId: string, success: boolean, metadata: Record<string, any> = {}): Promise<void> {
    await this.logEvent({
      eventType: 'permission.check',
      userId,
      action,
      resource,
      severity: success ? 'info' : 'warning',
      metadata: {
        ...metadata,
        success,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Security events
  async logSecurityEvent(type: string, userId: string, severity: 'warning' | 'error' | 'critical' = 'warning', metadata: Record<string, any> = {}): Promise<void> {
    await this.logEvent({
      eventType: `security.${type}`,
      userId,
      action: type,
      resource: 'security',
      severity,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }

  // User management events
  async logUserEvent(action: string, targetUserId: string, performedBy: string, metadata: Record<string, any> = {}): Promise<void> {
    await this.logEvent({
      eventType: 'user.management',
      userId: performedBy,
      action,
      resource: 'user',
      severity: 'info',
      metadata: {
        ...metadata,
        targetUserId,
        timestamp: new Date().toISOString()
      }
    });
  }

  private formatStandardLog(event: AuditEvent): StandardizedLogEntry {
    const timestamp = event.timestamp || new Date();
    
    return {
      id: this.generateLogId(),
      timestamp: timestamp.toISOString(),
      eventType: event.eventType,
      userId: event.userId,
      tenantId: event.tenantId,
      resource: event.resource,
      action: event.action,
      severity: event.severity,
      metadata: this.sanitizeMetadata(event.metadata || {}),
      context: {
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        sessionId: this.getSessionId()
      }
    };
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized = { ...metadata };
    
    // Remove PII fields
    const piiFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
    piiFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;
    
    const logs = [...this.logQueue];
    this.logQueue = [];
    
    try {
      // Store in localStorage for now (in production, this would go to a logging service)
      const existingLogs = this.getStoredLogs();
      const allLogs = [...existingLogs, ...logs];
      
      // Keep only last 1000 logs to prevent storage overflow
      const trimmedLogs = allLogs.slice(-1000);
      localStorage.setItem('audit_logs', JSON.stringify(trimmedLogs));
      
      console.log(`📋 Audit: Flushed ${logs.length} log entries`);
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Re-add logs to queue if flush failed
      this.logQueue = [...logs, ...this.logQueue];
    }
  }

  private getStoredLogs(): StandardizedLogEntry[] {
    try {
      const stored = localStorage.getItem('audit_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private startBatchProcessor(): void {
    setInterval(() => {
      this.flushLogs();
    }, this.flushInterval);
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    return sessionStorage.getItem('session_id') || 'unknown';
  }

  // Method to retrieve logs (for debugging/monitoring)
  getLogs(limit: number = 100): StandardizedLogEntry[] {
    const logs = this.getStoredLogs();
    return logs.slice(-limit).reverse(); // Most recent first
  }
}

export const auditLoggingService = AuditLoggingService.getInstance();
