
# Log Format Standardization

> **Version**: 4.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document serves as the **canonical reference** for standardized log format across all subsystems. It defines the structure, fields, and requirements for all logging in the system.

## Standard Log Format

### Core Structure

All logs must follow this standardized structure:

```typescript
interface StandardLogFormat {
  // Required base fields
  timestamp: string;    // ISO 8601 format with timezone
  level: LogLevel;      // 'debug' | 'info' | 'warn' | 'error' | 'critical'
  message: string;      // Human-readable message
  source: string;       // Component/module generating the log
  
  // Contextual information
  context?: {
    requestId?: string;    // Unique request identifier
    sessionId?: string;    // User session identifier
    tenantId?: string;     // Multi-tenant identifier
    userId?: string;       // User identifier
    traceId?: string;      // Distributed tracing ID
  };
  
  // Event-specific data
  data?: Record<string, any>; // Event-specific information
  
  // Error information (for error and critical levels)
  error?: {
    name?: string;           // Error type/name
    message?: string;        // Error message
    stack?: string;          // Stack trace (development only)
    code?: string | number;  // Error code
  };
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
```

### Specialized Log Types

#### Audit Logs

Audit logs track security-relevant events and must include:

```typescript
interface AuditLog extends StandardLogFormat {
  audit: {
    action: string;          // The action performed
    outcome: 'success' | 'failure' | 'error';
    resource: {
      type: string;          // Resource type
      id: string;            // Resource identifier
    };
    changes?: {
      before: any;           // Resource state before change
      after: any;            // Resource state after change
    };
    metadata: {
      ipAddress?: string;    // Originating IP address
      userAgent?: string;    // User agent information
    }
  }
}
```

#### Performance Logs

Performance logs track system performance metrics:

```typescript
interface PerformanceLog extends StandardLogFormat {
  performance: {
    operation: string;       // Operation name
    durationMs: number;      // Duration in milliseconds
    resourceUsage?: {
      cpu?: number;          // CPU utilization percentage
      memory?: number;       // Memory usage in MB
    };
    metadata?: Record<string, any>; // Additional performance data
  }
}
```

## Implementation Guidelines

### Logging Rules

1. **Consistency**: All logs must follow the standardized format
2. **Completeness**: Required fields must always be present
3. **Context Preservation**: Context fields must be propagated
4. **Sensitive Data**: Never log passwords, tokens, or PII
5. **Performance**: Logging must not significantly impact performance

### Log Levels Usage

- **debug**: Detailed information for debugging
- **info**: General information about system operation
- **warn**: Potential issues that don't prevent operation
- **error**: Errors that prevent specific operations
- **critical**: System-wide failures requiring immediate attention

## Related Documentation

- **[PERFORMANCE_STRATEGIES.md](PERFORMANCE_STRATEGIES.md)**: Performance optimization for logging
- **[SECURITY_INTEGRATION.md](SECURITY_INTEGRATION.md)**: Security integration for logging
- **[PII_PROTECTION.md](PII_PROTECTION.md)**: Handling of sensitive information

## Version History

- **4.0.0**: Established as standalone canonical reference without circular references (2025-05-23)
- **3.0.0**: Simplified to entry point for consolidated implementation (2025-05-23)
- **2.0.0**: Refactored into smaller specialized documents (2025-05-23)
- **1.0.0**: Initial document creation (2025-05-22)
