
# Log Format Standardization

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document defines standardized log formats across all subsystems to ensure consistency, searchability, and compliance with logging requirements. It serves as the canonical reference for formatting, structuring, and categorizing system logs.

## Log Format Principles

All system logs must adhere to these principles:

1. **Structured Logging**: All logs must be structured (JSON) rather than plain text
2. **Required Fields**: Every log entry must include a base set of required fields
3. **Consistent Naming**: Field names must follow established naming conventions
4. **Proper Typing**: Field values must use appropriate data types
5. **Context Preservation**: Contextual information must be preserved in all logs

## Standard Log Format

### Base Log Object

Every log entry must include these base fields:

```json
{
  "timestamp": "2025-05-22T12:34:56.789Z",
  "level": "info",
  "message": "Human readable message",
  "category": "security",
  "source": "auth-service",
  "traceId": "abcd1234-ef56-7890-abcd-1234efghijkl",
  "context": {
    "tenantId": "tenant-1234",
    "userId": "user-5678",
    "requestId": "req-9012",
    "ip": "192.168.1.1"
  },
  "details": {
    // Event-specific details
  }
}
```

### Required Fields

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `timestamp` | ISO 8601 string | Time the event occurred | Always |
| `level` | String | Log level (debug, info, warn, error, critical) | Always |
| `message` | String | Human-readable description | Always |
| `category` | String | Functional category of log | Always |
| `source` | String | System component that generated the log | Always |
| `traceId` | String | Correlation ID for distributed tracing | Always |
| `context` | Object | Contextual information about the event | Always |
| `details` | Object | Event-specific details | When applicable |

### Context Object

The context object must include:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `tenantId` | String | ID of the tenant in context | In multi-tenant operations |
| `userId` | String | ID of the user performing the action | In user-initiated actions |
| `requestId` | String | ID of the HTTP/API request | In request-driven contexts |
| `ip` | String | IP address source | When available |
| `userAgent` | String | User agent information | When available |
| `sessionId` | String | User session identifier | When available |

### Standardized Categories

Logs must use these standardized categories:

| Category | Description | Examples |
|----------|-------------|----------|
| `security` | Security-related events | Authentication, authorization, security configuration |
| `audit` | User activities requiring audit trails | Resource creation, permission changes, settings updates |
| `performance` | Performance-related events | Slow queries, cache operations, resource utilization |
| `error` | System errors | Exceptions, failures, connectivity issues |
| `usage` | System usage metrics | Feature usage, user interaction patterns |
| `system` | System operations | Startup, shutdown, configuration changes |
| `data` | Data operations | Database migrations, data imports/exports |
| `integration` | External integrations | API calls, webhook events, third-party services |

### Log Levels

Use these standardized log levels:

| Level | Description | Usage |
|-------|-------------|-------|
| `debug` | Detailed debugging information | Development and troubleshooting |
| `info` | Normal system operations | Regular operations, status changes |
| `warn` | Warning conditions | Non-critical issues that should be addressed |
| `error` | Error conditions | Failed operations, exceptions |
| `critical` | Critical conditions | System failures requiring immediate attention |

## Subsystem-Specific Formats

### Security Logs

Security logs must include additional security-specific fields:

```json
{
  // Base fields
  "category": "security",
  "details": {
    "eventType": "authentication",
    "outcome": "failure",
    "reason": "invalid_credentials",
    "target": {
      "type": "user",
      "id": "user-5678"
    },
    "severity": "medium"
  }
}
```

#### Security Event Types

| Event Type | Description |
|------------|-------------|
| `authentication` | User login/logout events |
| `authorization` | Permission checks |
| `configuration` | Security setting changes |
| `credential` | Credential changes |
| `resource_access` | Resource access attempts |
| `policy` | Policy changes |

### Audit Logs

Audit logs must include additional audit-specific fields:

```json
{
  // Base fields
  "category": "audit",
  "details": {
    "action": "create",
    "resource": {
      "type": "user",
      "id": "user-1234"
    },
    "changes": {
      "before": { /* State before change */ },
      "after": { /* State after change */ }
    },
    "metadata": {
      "approvedBy": "user-5678",
      "reason": "New hire onboarding"
    }
  }
}
```

#### Audit Actions

| Action | Description |
|--------|-------------|
| `create` | Resource creation |
| `read` | Resource read |
| `update` | Resource update |
| `delete` | Resource deletion |
| `enable` | Resource or feature enablement |
| `disable` | Resource or feature disablement |
| `assign` | Role or permission assignment |
| `revoke` | Role or permission revocation |

### Performance Logs

Performance logs must include additional performance-specific fields:

```json
{
  // Base fields
  "category": "performance",
  "details": {
    "operationType": "query",
    "operation": "getUserPermissions",
    "duration": 123.45,
    "metrics": {
      "queriesExecuted": 5,
      "rowsProcessed": 150,
      "cacheHits": 3,
      "cacheMisses": 2
    }
  }
}
```

#### Performance Metrics

| Metric Type | Description |
|-------------|-------------|
| `duration` | Time taken in milliseconds |
| `queriesExecuted` | Number of database queries |
| `rowsProcessed` | Number of database rows |
| `cacheHits` | Number of cache hits |
| `cacheMisses` | Number of cache misses |
| `resourceUsage` | CPU, memory, or other resource usage |

## Implementation Guidelines

### Logging Service Interface

All subsystems must use this common logging interface:

```typescript
interface LoggingService {
  debug(message: string, data?: Record<string, any>): void;
  info(message: string, data?: Record<string, any>): void;
  warn(message: string, data?: Record<string, any>): void;
  error(message: string, data?: Record<string, any>): void;
  critical(message: string, data?: Record<string, any>): void;
  
  withContext(context: Record<string, any>): LoggingService;
  withTraceId(traceId: string): LoggingService;
  withCategory(category: string): LoggingService;
  withSource(source: string): LoggingService;
}
```

### Example Implementation

```typescript
class StandardLogger implements LoggingService {
  private context: Record<string, any> = {};
  private traceId: string = generateDefaultTraceId();
  private category: string = 'system';
  private source: string = 'application';
  
  constructor(options?: {
    category?: string;
    source?: string;
    context?: Record<string, any>;
    traceId?: string;
  }) {
    if (options) {
      this.category = options.category || this.category;
      this.source = options.source || this.source;
      this.context = options.context || this.context;
      this.traceId = options.traceId || this.traceId;
    }
  }
  
  private createLogEntry(
    level: string,
    message: string,
    data?: Record<string, any>
  ): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      category: this.category,
      source: this.source,
      traceId: this.traceId,
      context: {
        ...this.context,
        ...getCurrentRequestContext()
      },
      details: data || {}
    };
  }
  
  debug(message: string, data?: Record<string, any>): void {
    const logEntry = this.createLogEntry('debug', message, data);
    this.writeLog(logEntry);
  }
  
  info(message: string, data?: Record<string, any>): void {
    const logEntry = this.createLogEntry('info', message, data);
    this.writeLog(logEntry);
  }
  
  warn(message: string, data?: Record<string, any>): void {
    const logEntry = this.createLogEntry('warn', message, data);
    this.writeLog(logEntry);
  }
  
  error(message: string, data?: Record<string, any>): void {
    const logEntry = this.createLogEntry('error', message, data);
    this.writeLog(logEntry);
  }
  
  critical(message: string, data?: Record<string, any>): void {
    const logEntry = this.createLogEntry('critical', message, data);
    this.writeLog(logEntry);
  }
  
  withContext(context: Record<string, any>): LoggingService {
    return new StandardLogger({
      category: this.category,
      source: this.source,
      traceId: this.traceId,
      context: { ...this.context, ...context }
    });
  }
  
  withTraceId(traceId: string): LoggingService {
    return new StandardLogger({
      category: this.category,
      source: this.source,
      context: this.context,
      traceId
    });
  }
  
  withCategory(category: string): LoggingService {
    return new StandardLogger({
      category,
      source: this.source,
      context: this.context,
      traceId: this.traceId
    });
  }
  
  withSource(source: string): LoggingService {
    return new StandardLogger({
      category: this.category,
      source,
      context: this.context,
      traceId: this.traceId
    });
  }
  
  private writeLog(logEntry: Record<string, any>): void {
    // Write to appropriate output based on environment
    if (isProduction()) {
      // In production, send to centralized logging system
      productionLogWriter.write(logEntry);
    } else {
      // In development, output to console
      console.log(JSON.stringify(logEntry, null, 2));
    }
  }
}
```

### Usage Examples

```typescript
// Create logger with default settings
const logger = new StandardLogger({
  source: 'auth-service',
  category: 'security'
});

// Log simple message
logger.info('User logged in successfully');

// Log with details
logger.info('Permission check completed', {
  outcome: 'granted',
  permission: 'users:create',
  resourceId: 'user-1234'
});

// Log with context from current request
const requestLogger = logger.withContext({
  requestId: req.id,
  sessionId: req.session.id,
  ip: req.ip,
  userAgent: req.headers['user-agent']
});

requestLogger.debug('Processing request');

// Log error with exception details
try {
  // Some operation that might fail
} catch (error) {
  logger.error('Operation failed', {
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    operation: 'createUser',
    parameters: { email: 'user@example.com' }
  });
}
```

## Integration with Audit System

The standardized log format integrates with the audit system:

1. **Event Filtering**: Security and audit events are automatically filtered and sent to the audit system
2. **Format Transformation**: Logs are transformed into audit records with appropriate fields
3. **Compliance Tagging**: Logs are tagged for compliance requirements

## Performance Considerations

To maintain system performance while logging:

1. **Sampling**: Apply sampling for high-volume debug logs
2. **Batching**: Batch log writes to minimize I/O overhead
3. **Async Processing**: Use asynchronous logging for non-critical logs
4. **Selective Detail**: Include detailed data only at appropriate log levels

## Related Documentation

- **[LOGGING_SERVICE.md](LOGGING_SERVICE.md)**: Audit logging service implementation
- **[DATABASE_STRUCTURE.md](DATABASE_STRUCTURE.md)**: Audit log storage schema
- **[SECURITY_INTEGRATION.md](SECURITY_INTEGRATION.md)**: Security audit integration
- **[STORAGE_RETENTION.md](STORAGE_RETENTION.md)**: Log retention policies
- **[../security/ERROR_HANDLING.md](../security/ERROR_HANDLING.md)**: Error handling standards
- **[../integration/EVENT_ARCHITECTURE.md](../integration/EVENT_ARCHITECTURE.md)**: Event architecture

## Version History

- **1.0.0**: Initial document creation (2025-05-22)
