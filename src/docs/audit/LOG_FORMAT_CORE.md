
# Log Format Core Structure

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document defines the core structure of standardized log formats across all subsystems. It serves as the foundation for formatting, structuring, and categorizing system logs.

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

## Standardized Categories

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

## Related Documentation

- **[LOG_FORMAT_STANDARDIZATION.md](LOG_FORMAT_STANDARDIZATION.md)**: Standardized log format overview
- **[LOG_FORMAT_SUBSYSTEMS.md](LOG_FORMAT_SUBSYSTEMS.md)**: Subsystem-specific log formats
- **[LOG_FORMAT_IMPLEMENTATION.md](LOG_FORMAT_IMPLEMENTATION.md)**: Implementation guidelines
- **[LOG_FORMAT_INTEGRATION.md](LOG_FORMAT_INTEGRATION.md)**: Integration with other systems
- **[../security/ERROR_HANDLING.md](../security/ERROR_HANDLING.md)**: Error handling standards

## Version History

- **1.0.0**: Initial document created from LOG_FORMAT_STANDARDIZATION.md refactoring (2025-05-23)
