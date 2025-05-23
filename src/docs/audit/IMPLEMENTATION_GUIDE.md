# Audit System Implementation Guide

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document provides practical implementation guidance for the audit logging system, including code examples, integration patterns, and best practices for effective audit trail management.

## Core Audit Logger Implementation

### Base Audit Logger Class

```typescript
// Base audit logger implementation
import { v4 as uuidv4 } from 'uuid';

export interface AuditEventOptions {
  eventType: string;
  userId?: string;
  tenantId?: string;
  resource?: string;
  resourceId?: string;
  action?: string;
  status?: 'success' | 'failed' | 'denied' | 'error';
  metadata?: Record<string, any>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export interface AuditEvent extends AuditEventOptions {
  id: string;
  timestamp: string;
  applicationVersion: string;
  environmentId: string;
}

export class AuditLogger {
  private storageAdapter: AuditStorageAdapter;
  private piiProcessor: PiiProcessor;
  private applicationVersion: string;
  private environmentId: string;
  
  constructor(options: {
    storageAdapter: AuditStorageAdapter;
    piiProcessor: PiiProcessor;
    applicationVersion: string;
    environmentId: string;
  }) {
    this.storageAdapter = options.storageAdapter;
    this.piiProcessor = options.piiProcessor;
    this.applicationVersion = options.applicationVersion;
    this.environmentId = options.environmentId;
  }
  
  async log(options: AuditEventOptions): Promise<string> {
    // 1. Generate audit event ID
    const id = uuidv4();
    
    // 2. Create timestamp
    const timestamp = new Date().toISOString();
    
    // 3. Process PII in metadata
    const sanitizedMetadata = options.metadata 
      ? this.piiProcessor.sanitize(options.metadata)
      : undefined;
    
    // 4. Construct full audit event
    const auditEvent: AuditEvent = {
      ...options,
      id,
      timestamp,
      applicationVersion: this.applicationVersion,
      environmentId: this.environmentId,
      metadata: sanitizedMetadata
    };
    
    // 5. Store audit event
    await this.storageAdapter.store(auditEvent);
    
    // 6. Emit event for real-time monitoring
    this.emitAuditEvent(auditEvent);
    
    // 7. Return event ID for reference
    return id;
  }
  
  private emitAuditEvent(event: AuditEvent): void {
    // Implementation depends on event system
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      // Browser environment
      window.dispatchEvent(new CustomEvent('audit', { detail: event }));
    } else {
      // Node.js environment
      process.emit('audit', event);
    }
  }
}
```

### Storage Adapter Implementation

```typescript
// Database storage adapter implementation
export class DatabaseAuditStorageAdapter implements AuditStorageAdapter {
  private db: Database;
  
  constructor(db: Database) {
    this.db = db;
  }
  
  async store(event: AuditEvent): Promise<void> {
    try {
      await this.db.from('audit_logs').insert({
        id: event.id,
        event_type: event.eventType,
        user_id: event.userId,
        tenant_id: event.tenantId,
        resource: event.resource,
        resource_id: event.resourceId,
        action: event.action,
        status: event.status,
        metadata: event.metadata,
        severity: event.severity,
        timestamp: event.timestamp,
        application_version: event.applicationVersion,
        environment_id: event.environmentId
      });
    } catch (error) {
      // Use fallback storage if database fails
      console.error('Failed to store audit event:', error);
      await this.storeToFallback(event);
    }
  }
  
  private async storeToFallback(event: AuditEvent): Promise<void> {
    // Implement fallback storage strategy
    // Could be local storage, file system, or memory buffer for retry
  }
}

// HTTP storage adapter implementation
export class HttpAuditStorageAdapter implements AuditStorageAdapter {
  private apiEndpoint: string;
  private apiKey: string;
  
  constructor(apiEndpoint: string, apiKey: string) {
    this.apiEndpoint = apiEndpoint;
    this.apiKey = apiKey;
  }
  
  async store(event: AuditEvent): Promise<void> {
    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      // Implement retry logic or fallback
      console.error('Failed to send audit event:', error);
    }
  }
}
```

### PII Processor Implementation

```typescript
// PII processor implementation
export class PiiProcessor {
  private piiFields: string[];
  
  constructor(piiFields: string[] = ['email', 'password', 'ssn', 'creditCard']) {
    this.piiFields = piiFields;
  }
  
  sanitize(data: Record<string, any>): Record<string, any> {
    const result = { ...data };
    
    for (const key of Object.keys(result)) {
      // Check if key is a PII field
      if (this.isPiiField(key)) {
        result[key] = this.maskPii(String(result[key]));
        continue;
      }
      
      // Recursively process nested objects
      if (result[key] && typeof result[key] === 'object') {
        result[key] = this.sanitize(result[key]);
      }
    }
    
    return result;
  }
  
  private isPiiField(field: string): boolean {
    return this.piiFields.some(pii => 
      field.toLowerCase().includes(pii.toLowerCase())
    );
  }
  
  private maskPii(value: string): string {
    if (!value || value.length < 4) {
      return '***';
    }
    
    // Keep first and last character, mask the rest
    return `${value.charAt(0)}${'*'.repeat(value.length - 2)}${value.charAt(value.length - 1)}`;
  }
}
```

## Integration Examples

### RBAC System Integration

```typescript
// RBAC audit integration implementation
import { AuditLogger } from '../audit/AuditLogger';

export class RbacAuditIntegration {
  private auditLogger: AuditLogger;
  
  constructor(auditLogger: AuditLogger) {
    this.auditLogger = auditLogger;
  }
  
  async logPermissionCheck(
    userId: string,
    resource: string,
    action: string,
    granted: boolean,
    context?: Record<string, any>
  ): Promise<void> {
    await this.auditLogger.log({
      eventType: 'permission_check',
      userId,
      resource,
      action,
      status: granted ? 'success' : 'denied',
      metadata: context,
      severity: granted ? 'info' : 'warning'
    });
  }
  
  async logRoleAssignment(
    targetUserId: string,
    assignedBy: string,
    roleId: string,
    roleName: string
  ): Promise<void> {
    await this.auditLogger.log({
      eventType: 'role_assignment',
      userId: assignedBy,
      resource: 'roles',
      resourceId: roleId,
      action: 'assign',
      status: 'success',
      metadata: {
        targetUserId,
        roleName
      }
    });
  }
  
  async logRoleRevocation(
    targetUserId: string,
    revokedBy: string,
    roleId: string,
    roleName: string
  ): Promise<void> {
    await this.auditLogger.log({
      eventType: 'role_revocation',
      userId: revokedBy,
      resource: 'roles',
      resourceId: roleId,
      action: 'revoke',
      status: 'success',
      metadata: {
        targetUserId,
        roleName
      }
    });
  }
  
  async logPermissionChange(
    changedBy: string,
    changeType: 'created' | 'updated' | 'deleted' | 'assigned' | 'revoked',
    roleId?: string,
    permissionId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.auditLogger.log({
      eventType: 'permission_change',
      userId: changedBy,
      resource: 'permissions',
      resourceId: permissionId,
      action: changeType,
      status: 'success',
      metadata: {
        roleId,
        ...details
      }
    });
  }
}
```

### Authentication System Integration

```typescript
// Authentication audit integration implementation
import { AuditLogger } from '../audit/AuditLogger';

export class AuthAuditIntegration {
  private auditLogger: AuditLogger;
  
  constructor(auditLogger: AuditLogger) {
    this.auditLogger = auditLogger;
  }
  
  async logLoginAttempt(
    userId: string | undefined,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    reason?: string
  ): Promise<string> {
    return this.auditLogger.log({
      eventType: 'login_attempt',
      userId,
      action: 'login',
      status: success ? 'success' : 'failed',
      severity: success ? 'info' : 'warning',
      metadata: {
        ipAddress,
        userAgent,
        reason
      }
    });
  }
  
  async logLogout(userId: string): Promise<string> {
    return this.auditLogger.log({
      eventType: 'logout',
      userId,
      action: 'logout',
      status: 'success'
    });
  }
  
  async logPasswordChange(
    userId: string, 
    success: boolean,
    reason?: string
  ): Promise<string> {
    return this.auditLogger.log({
      eventType: 'password_change',
      userId,
      action: 'change_password',
      status: success ? 'success' : 'failed',
      severity: success ? 'info' : 'warning',
      metadata: { reason }
    });
  }
  
  async logMfaEvent(
    userId: string,
    action: 'enroll' | 'verify' | 'disable',
    success: boolean,
    method: 'app' | 'sms' | 'email',
    reason?: string
  ): Promise<string> {
    return this.auditLogger.log({
      eventType: 'mfa_event',
      userId,
      action,
      status: success ? 'success' : 'failed',
      severity: success ? 'info' : 'warning',
      metadata: {
        method,
        reason
      }
    });
  }
}
```

## Audit Middleware

```typescript
// Express audit middleware implementation
import { Request, Response, NextFunction } from 'express';
import { AuditLogger } from '../audit/AuditLogger';

export function createAuditMiddleware(auditLogger: AuditLogger) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Capture original methods
    const originalEnd = res.end;
    const originalJson = res.json;
    
    // Timestamp request start
    const requestStartTime = Date.now();
    
    // Create audit context
    const auditContext = {
      path: req.path,
      method: req.method,
      query: req.query,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type']
      },
      ip: req.ip
    };
    
    // Override response methods to capture status
    res.json = function(body: any) {
      logResponse(res.statusCode, body);
      return originalJson.call(this, body);
    };
    
    res.end = function(chunk?: any) {
      logResponse(res.statusCode, chunk);
      return originalEnd.apply(this, arguments);
    };
    
    // Log response
    function logResponse(statusCode: number, body?: any) {
      const responseTime = Date.now() - requestStartTime;
      
      let status: 'success' | 'failed' | 'error';
      let severity: 'info' | 'warning' | 'error';
      
      if (statusCode >= 200 && statusCode < 300) {
        status = 'success';
        severity = 'info';
      } else if (statusCode >= 400 && statusCode < 500) {
        status = 'failed';
        severity = 'warning';
      } else {
        status = 'error';
        severity = 'error';
      }
      
      auditLogger.log({
        eventType: 'api_request',
        userId: req.user?.id,
        tenantId: req.headers['x-tenant-id'] as string,
        resource: req.baseUrl,
        action: req.method,
        status,
        severity,
        metadata: {
          ...auditContext,
          statusCode,
          responseTime,
          responseSize: body ? JSON.stringify(body).length : 0
        }
      });
    }
    
    next();
  };
}
```

## Audit Search and Retrieval

```typescript
// Audit search implementation
export interface AuditSearchOptions {
  eventType?: string;
  userId?: string;
  tenantId?: string;
  resource?: string;
  action?: string;
  status?: 'success' | 'failed' | 'denied' | 'error';
  severity?: 'info' | 'warning' | 'error' | 'critical';
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

export class AuditSearchService {
  private db: Database;
  
  constructor(db: Database) {
    this.db = db;
  }
  
  async searchAuditLogs(options: AuditSearchOptions): Promise<AuditEvent[]> {
    let query = this.db
      .from('audit_logs')
      .select('*');
    
    // Apply filters
    if (options.eventType) {
      query = query.eq('event_type', options.eventType);
    }
    
    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }
    
    if (options.tenantId) {
      query = query.eq('tenant_id', options.tenantId);
    }
    
    if (options.resource) {
      query = query.eq('resource', options.resource);
    }
    
    if (options.action) {
      query = query.eq('action', options.action);
    }
    
    if (options.status) {
      query = query.eq('status', options.status);
    }
    
    if (options.severity) {
      query = query.eq('severity', options.severity);
    }
    
    if (options.startTime) {
      query = query.gte('timestamp', options.startTime.toISOString());
    }
    
    if (options.endTime) {
      query = query.lte('timestamp', options.endTime.toISOString());
    }
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.offset(options.offset);
    }
    
    // Order by timestamp descending (newest first)
    query = query.order('timestamp', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to search audit logs: ${error.message}`);
    }
    
    return data || [];
  }
  
  async getAuditEventById(id: string): Promise<AuditEvent | null> {
    const { data, error } = await this.db
      .from('audit_logs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data;
  }
}
```

## Audit Data Retention Implementation

```typescript
// Audit retention policy implementation
export class AuditRetentionService {
  private db: Database;
  
  constructor(db: Database) {
    this.db = db;
  }
  
  async applyRetentionPolicy(options: {
    retentionDays: number;
    batchSize: number;
    archiveBeforeDelete?: boolean;
  }): Promise<number> {
    const { retentionDays, batchSize, archiveBeforeDelete } = options;
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffIso = cutoffDate.toISOString();
    
    // Get records to delete
    const { data, error } = await this.db
      .from('audit_logs')
      .select('id')
      .lt('timestamp', cutoffIso)
      .limit(batchSize);
    
    if (error || !data || data.length === 0) {
      return 0;
    }
    
    const recordIds = data.map(record => record.id);
    
    // Archive if requested
    if (archiveBeforeDelete) {
      await this.archiveRecords(recordIds);
    }
    
    // Delete records
    const { error: deleteError } = await this.db
      .from('audit_logs')
      .delete()
      .in('id', recordIds);
    
    if (deleteError) {
      throw new Error(`Failed to delete audit logs: ${deleteError.message}`);
    }
    
    return recordIds.length;
  }
  
  private async archiveRecords(recordIds: string[]): Promise<void> {
    // Implementation depends on archiving strategy
    // Could move to another table, export to file, etc.
  }
}
```

## Testing Audit Implementations

```typescript
// Audit testing implementation
describe('AuditLogger', () => {
  let auditLogger: AuditLogger;
  let mockStorageAdapter: jest.Mocked<AuditStorageAdapter>;
  let mockPiiProcessor: jest.Mocked<PiiProcessor>;
  
  beforeEach(() => {
    mockStorageAdapter = {
      store: jest.fn().mockResolvedValue(undefined)
    };
    
    mockPiiProcessor = {
      sanitize: jest.fn().mockImplementation(data => data)
    };
    
    auditLogger = new AuditLogger({
      storageAdapter: mockStorageAdapter,
      piiProcessor: mockPiiProcessor,
      applicationVersion: '1.0.0',
      environmentId: 'test'
    });
  });
  
  test('should log audit event with correct structure', async () => {
    // Arrange
    const eventOptions = {
      eventType: 'test_event',
      userId: 'user-123',
      resource: 'documents',
      action: 'view',
      metadata: { documentName: 'test.pdf' }
    };
    
    // Act
    const eventId = await auditLogger.log(eventOptions);
    
    // Assert
    expect(eventId).toBeDefined();
    expect(typeof eventId).toBe('string');
    
    // Verify storage was called with correct structure
    expect(mockStorageAdapter.store).toHaveBeenCalledTimes(1);
    const storedEvent = mockStorageAdapter.store.mock.calls[0][0];
    expect(storedEvent).toMatchObject({
      id: expect.any(String),
      timestamp: expect.any(String),
      eventType: 'test_event',
      userId: 'user-123',
      resource: 'documents',
      action: 'view',
      applicationVersion: '1.0.0',
      environmentId: 'test',
      metadata: { documentName: 'test.pdf' }
    });
  });
  
  test('should sanitize PII in metadata', async () => {
    // Arrange
    const sensitiveMetadata = {
      email: 'user@example.com',
      documentName: 'test.pdf'
    };
    
    mockPiiProcessor.sanitize.mockReturnValueOnce({
      email: 'u***r@example.com',
      documentName: 'test.pdf'
    });
    
    // Act
    await auditLogger.log({
      eventType: 'test_event',
      metadata: sensitiveMetadata
    });
    
    // Assert
    expect(mockPiiProcessor.sanitize).toHaveBeenCalledWith(sensitiveMetadata);
    expect(mockStorageAdapter.store).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          email: 'u***r@example.com',
          documentName: 'test.pdf'
        }
      })
    );
  });
});
```

## Related Documentation

- **[README.md](README.md)**: Audit system overview
- **[SECURITY_INTEGRATION.md](SECURITY_INTEGRATION.md)**: Security integration details
- **[LOG_FORMAT_STANDARDIZATION.md](LOG_FORMAT_STANDARDIZATION.md)**: Log format standards
- **[PII_PROTECTION.md](PII_PROTECTION.md)**: PII handling in audit logs
- **[../integration/RBAC_AUDIT_INTEGRATION.md](../integration/RBAC_AUDIT_INTEGRATION.md)**: RBAC audit integration

## Version History

- **1.0.0**: Initial audit implementation guide (2025-05-22)
