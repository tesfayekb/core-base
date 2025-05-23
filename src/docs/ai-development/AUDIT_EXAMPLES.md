
# Audit Logging Implementation Examples

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Overview

Concrete audit logging implementation examples showing standardized event logging and monitoring.

## Structured Audit Logger

```typescript
// Structured audit logger implementation
import { v4 as uuidv4 } from 'uuid';

interface AuditEventBase {
  eventType: string;
  userId?: string;
  tenantId?: string;
  resource?: string;
  action?: string;
  status?: 'success' | 'failed' | 'error' | 'denied';
  metadata?: Record<string, any>;
}

interface StoredAuditEvent extends AuditEventBase {
  id: string;
  timestamp: string;
  environmentId: string;
  applicationVersion: string;
}

export class AuditLogger {
  constructor(
    private storageAdapter: AuditStorageAdapter,
    private applicationVersion: string,
    private environmentId: string,
    private piiProcessor: PiiProcessor
  ) {}
  
  async log(event: AuditEventBase): Promise<string> {
    // 1. Generate event ID and timestamp
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    // 2. Sanitize PII in metadata
    const sanitizedMetadata = event.metadata 
      ? this.piiProcessor.sanitize(event.metadata)
      : undefined;
    
    // 3. Create structured event
    const storedEvent: StoredAuditEvent = {
      ...event,
      id,
      timestamp,
      environmentId: this.environmentId,
      applicationVersion: this.applicationVersion,
      metadata: sanitizedMetadata
    };
    
    // 4. Store event
    await this.storageAdapter.store(storedEvent);
    
    // 5. Emit for real-time monitoring if configured
    if (this.shouldEmitRealTime(event.eventType)) {
      this.emitRealTimeEvent(storedEvent);
    }
    
    // 6. Return event ID
    return id;
  }
  
  private shouldEmitRealTime(eventType: string): boolean {
    const realTimeEvents = [
      'authentication',
      'authorization_denied',
      'security_violation',
      'system_error'
    ];
    return realTimeEvents.includes(eventType);
  }
  
  private emitRealTimeEvent(event: StoredAuditEvent): void {
    // Emit to real-time monitoring system
    if (global.auditEventEmitter) {
      global.auditEventEmitter.emit('audit', event);
    }
  }
}

// PII processor for sanitizing sensitive data
export class PiiProcessor {
  private piiPatterns = [
    { name: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
    { name: 'phone', pattern: /\b\d{3}-\d{3}-\d{4}\b/g },
    { name: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
    { name: 'credit_card', pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g }
  ];
  
  sanitize(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data };
    
    // Sanitize known PII fields
    const piiFields = ['password', 'token', 'secret', 'key'];
    piiFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    // Sanitize string values that match PII patterns
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        let value = sanitized[key] as string;
        
        this.piiPatterns.forEach(pattern => {
          value = value.replace(pattern.pattern, `[REDACTED_${pattern.name.toUpperCase()}]`);
        });
        
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }
}
```

## Audit Storage Adapter

```typescript
// Supabase audit storage adapter
export class SupabaseAuditStorageAdapter implements AuditStorageAdapter {
  constructor(private supabase: SupabaseClient) {}
  
  async store(event: StoredAuditEvent): Promise<void> {
    const { error } = await this.supabase
      .from('audit_logs')
      .insert({
        id: event.id,
        event_type: event.eventType,
        user_id: event.userId,
        tenant_id: event.tenantId,
        resource: event.resource,
        action: event.action,
        status: event.status,
        metadata: event.metadata,
        timestamp: event.timestamp,
        environment_id: event.environmentId,
        application_version: event.applicationVersion
      });
      
    if (error) {
      console.error('Failed to store audit event:', error);
      // Consider fallback storage or retry logic
      throw new Error(`Audit storage failed: ${error.message}`);
    }
  }
  
  async query(criteria: AuditQueryCriteria): Promise<StoredAuditEvent[]> {
    let query = this.supabase
      .from('audit_logs')
      .select('*');
      
    // Apply filters
    if (criteria.userId) {
      query = query.eq('user_id', criteria.userId);
    }
    
    if (criteria.tenantId) {
      query = query.eq('tenant_id', criteria.tenantId);
    }
    
    if (criteria.eventType) {
      query = query.eq('event_type', criteria.eventType);
    }
    
    if (criteria.resource) {
      query = query.eq('resource', criteria.resource);
    }
    
    if (criteria.action) {
      query = query.eq('action', criteria.action);
    }
    
    if (criteria.status) {
      query = query.eq('status', criteria.status);
    }
    
    if (criteria.dateRange) {
      query = query
        .gte('timestamp', criteria.dateRange.start.toISOString())
        .lte('timestamp', criteria.dateRange.end.toISOString());
    }
    
    // Apply ordering and pagination
    query = query
      .order('timestamp', { ascending: false })
      .limit(criteria.limit || 100);
      
    if (criteria.offset) {
      query = query.range(criteria.offset, criteria.offset + (criteria.limit || 100) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Audit query failed: ${error.message}`);
    }
    
    return data.map(row => ({
      id: row.id,
      eventType: row.event_type,
      userId: row.user_id,
      tenantId: row.tenant_id,
      resource: row.resource,
      action: row.action,
      status: row.status,
      metadata: row.metadata,
      timestamp: row.timestamp,
      environmentId: row.environment_id,
      applicationVersion: row.application_version
    }));
  }
}

interface AuditQueryCriteria {
  userId?: string;
  tenantId?: string;
  eventType?: string;
  resource?: string;
  action?: string;
  status?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
}
```

## Audit Event Examples

```typescript
// Common audit event patterns
export class AuditEventTemplates {
  private auditLogger: AuditLogger;
  
  constructor(auditLogger: AuditLogger) {
    this.auditLogger = auditLogger;
  }
  
  // Authentication events
  async logUserSignIn(userId: string, success: boolean, metadata?: any): Promise<string> {
    return this.auditLogger.log({
      eventType: 'authentication',
      userId,
      action: 'sign_in',
      status: success ? 'success' : 'failed',
      metadata
    });
  }
  
  async logUserSignOut(userId: string): Promise<string> {
    return this.auditLogger.log({
      eventType: 'authentication',
      userId,
      action: 'sign_out',
      status: 'success'
    });
  }
  
  // Authorization events
  async logPermissionDenied(
    userId: string, 
    resource: string, 
    action: string, 
    tenantId?: string
  ): Promise<string> {
    return this.auditLogger.log({
      eventType: 'authorization',
      userId,
      tenantId,
      resource,
      action,
      status: 'denied'
    });
  }
  
  // Data access events
  async logDataAccess(
    userId: string,
    resource: string,
    action: string,
    resourceId?: string,
    tenantId?: string
  ): Promise<string> {
    return this.auditLogger.log({
      eventType: 'data_access',
      userId,
      tenantId,
      resource,
      action,
      status: 'success',
      metadata: resourceId ? { resourceId } : undefined
    });
  }
  
  // User management events
  async logUserCreated(
    createdBy: string,
    newUserId: string,
    tenantId?: string
  ): Promise<string> {
    return this.auditLogger.log({
      eventType: 'user_management',
      userId: createdBy,
      tenantId,
      resource: 'users',
      action: 'create',
      status: 'success',
      metadata: { targetUserId: newUserId }
    });
  }
  
  async logUserUpdated(
    updatedBy: string,
    targetUserId: string,
    changes: string[],
    tenantId?: string
  ): Promise<string> {
    return this.auditLogger.log({
      eventType: 'user_management',
      userId: updatedBy,
      tenantId,
      resource: 'users',
      action: 'update',
      status: 'success',
      metadata: { 
        targetUserId,
        fieldsChanged: changes
      }
    });
  }
  
  // Security events
  async logSecurityViolation(
    userId: string | undefined,
    violationType: string,
    details: any,
    tenantId?: string
  ): Promise<string> {
    return this.auditLogger.log({
      eventType: 'security_violation',
      userId,
      tenantId,
      action: violationType,
      status: 'error',
      metadata: details
    });
  }
  
  // System events
  async logSystemError(
    error: Error,
    context: any,
    userId?: string,
    tenantId?: string
  ): Promise<string> {
    return this.auditLogger.log({
      eventType: 'system_error',
      userId,
      tenantId,
      status: 'error',
      metadata: {
        errorMessage: error.message,
        errorStack: error.stack,
        context
      }
    });
  }
  
  // Tenant management events
  async logTenantSwitch(
    userId: string,
    fromTenantId: string | null,
    toTenantId: string
  ): Promise<string> {
    return this.auditLogger.log({
      eventType: 'tenant_management',
      userId,
      tenantId: toTenantId,
      action: 'switch',
      status: 'success',
      metadata: {
        fromTenantId,
        toTenantId
      }
    });
  }
}
```

## Audit Middleware Integration

```typescript
// Express middleware for automatic audit logging
export function auditMiddleware(auditLogger: AuditLogger) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Capture original res.json to log response
    const originalJson = res.json;
    let responseBody: any;
    
    res.json = function(body: any) {
      responseBody = body;
      return originalJson.call(this, body);
    };
    
    // Log after response is sent
    res.on('finish', async () => {
      try {
        const userId = req.user?.id;
        const tenantId = req.headers['x-tenant-id'] as string;
        
        // Determine event type based on route and method
        const eventType = determineEventType(req.path, req.method);
        const resource = extractResourceFromPath(req.path);
        const action = mapMethodToAction(req.method);
        
        // Determine status from response
        const status = res.statusCode >= 200 && res.statusCode < 300 
          ? 'success' 
          : res.statusCode >= 400 && res.statusCode < 500
          ? 'denied'
          : 'error';
        
        await auditLogger.log({
          eventType,
          userId,
          tenantId,
          resource,
          action,
          status,
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
            responseTime: Date.now() - req.startTime
          }
        });
      } catch (error) {
        console.error('Audit logging failed:', error);
      }
    });
    
    // Add start time for response time calculation
    req.startTime = Date.now();
    next();
  };
}

function determineEventType(path: string, method: string): string {
  if (path.includes('/auth/')) return 'authentication';
  if (path.includes('/api/')) return 'api_access';
  return 'system_access';
}

function extractResourceFromPath(path: string): string {
  const apiMatch = path.match(/\/api\/([^\/]+)/);
  return apiMatch ? apiMatch[1] : 'unknown';
}

function mapMethodToAction(method: string): string {
  const mapping: Record<string, string> = {
    'GET': 'view',
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete'
  };
  return mapping[method] || 'unknown';
}
```

## Audit Dashboard Component

```typescript
// React component for audit log viewing
export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<StoredAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AuditQueryCriteria>({
    limit: 50,
    offset: 0
  });
  
  const { data: auditLogs, isLoading, error } = useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: async () => {
      const response = await fetch('/api/audit/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      
      return response.json();
    }
  });
  
  const handleFilterChange = (newFilters: Partial<AuditQueryCriteria>) => {
    setFilters(prev => ({ ...prev, ...newFilters, offset: 0 }));
  };
  
  const handleLoadMore = () => {
    setFilters(prev => ({ 
      ...prev, 
      offset: (prev.offset || 0) + (prev.limit || 50) 
    }));
  };
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Audit Log Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Event Type</label>
            <select 
              className="mt-1 block w-full rounded-md border-gray-300"
              onChange={(e) => handleFilterChange({ eventType: e.target.value || undefined })}
            >
              <option value="">All Events</option>
              <option value="authentication">Authentication</option>
              <option value="authorization">Authorization</option>
              <option value="data_access">Data Access</option>
              <option value="user_management">User Management</option>
              <option value="security_violation">Security Violations</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select 
              className="mt-1 block w-full rounded-md border-gray-300"
              onChange={(e) => handleFilterChange({ status: e.target.value || undefined })}
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="denied">Denied</option>
              <option value="error">Error</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Resource</label>
            <input 
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300"
              placeholder="e.g., users, articles"
              onChange={(e) => handleFilterChange({ resource: e.target.value || undefined })}
            />
          </div>
        </div>
      </div>
      
      {/* Audit Logs Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Audit Logs</h3>
          
          {isLoading && <div>Loading audit logs...</div>}
          {error && <div className="text-red-500">Error loading logs: {error.message}</div>}
          
          {auditLogs && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log: StoredAuditEvent) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.eventType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.userId || 'Anonymous'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.resource || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.action || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.status === 'success' ? 'bg-green-100 text-green-800' :
                          log.status === 'failed' ? 'bg-red-100 text-red-800' :
                          log.status === 'denied' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

## Related Examples

- **Authentication Examples**: `AUTH_EXAMPLES.md`
- **Permission Examples**: `PERMISSION_EXAMPLES.md`
- **Multi-tenant Examples**: `MULTITENANT_EXAMPLES.md`

These audit examples provide comprehensive logging and monitoring capabilities for the system.
