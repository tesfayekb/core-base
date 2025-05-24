
# Log Format for Subsystems

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the specific log format requirements for different subsystems, extending the core log format defined in [LOG_FORMAT_CORE.md](LOG_FORMAT_CORE.md).

## Security Logs

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

### Security Event Types

| Event Type | Description |
|------------|-------------|
| `authentication` | User login/logout events |
| `authorization` | Permission checks |
| `configuration` | Security setting changes |
| `credential` | Credential changes |
| `resource_access` | Resource access attempts |
| `policy` | Policy changes |

## Audit Logs

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

### Audit Actions

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

## Performance Logs

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

### Performance Metrics

| Metric Type | Description |
|-------------|-------------|
| `duration` | Time taken in milliseconds |
| `queriesExecuted` | Number of database queries |
| `rowsProcessed` | Number of database rows |
| `cacheHits` | Number of cache hits |
| `cacheMisses` | Number of cache misses |
| `resourceUsage` | CPU, memory, or other resource usage |

## Related Documentation

- **[LOG_FORMAT_STANDARDIZATION.md](LOG_FORMAT_STANDARDIZATION.md)**: Standardized log format overview
- **[LOG_FORMAT_CORE.md](LOG_FORMAT_CORE.md)**: Core log format structure
- **[LOG_FORMAT_IMPLEMENTATION.md](LOG_FORMAT_IMPLEMENTATION.md)**: Implementation guidelines
- **[LOG_FORMAT_INTEGRATION.md](LOG_FORMAT_INTEGRATION.md)**: Integration with other systems
- **[../security/ERROR_HANDLING.md](../security/ERROR_HANDLING.md)**: Error handling standards

## Version History

- **1.0.0**: Initial document created from LOG_FORMAT_STANDARDIZATION.md refactoring (2025-05-23)
