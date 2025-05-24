
# Log Format Usage Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides usage patterns and best practices for the standardized log format defined in [LOG_FORMAT_CORE.md](LOG_FORMAT_CORE.md) using the interfaces specified in [LOG_FORMAT_INTERFACES.md](LOG_FORMAT_INTERFACES.md).

## Common Usage Patterns

### Basic Logging

```typescript
// Create logger with default settings
const logger = new StandardLogger({
  source: 'auth-service',
  category: 'security'
});

// Log simple message
logger.info('User logged in successfully');
```

### Logging with Details

```typescript
// Log with details
logger.info('Permission check completed', {
  outcome: 'granted',
  permission: 'users:create',
  resourceId: 'user-1234'
});
```

### Contextual Logging

```typescript
// Log with context from current request
const requestLogger = logger.withContext({
  requestId: req.id,
  sessionId: req.session.id,
  ip: req.ip,
  userAgent: req.headers['user-agent']
});

requestLogger.debug('Processing request');
```

### Error Logging

```typescript
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

### Source-Specific Logging

```typescript
// Create logger for a specific component
const databaseLogger = logger.withSource('database-service');
databaseLogger.info('Database connection established');

// Create logger for a specific component with specific category
const authAuditLogger = logger
  .withSource('authentication-service')
  .withCategory('audit');
  
authAuditLogger.info('Password changed successfully', {
  userId: 'user-1234'
});
```

## Best Practices

1. **Be Consistent**: Use the same logging pattern across your codebase
2. **Include Context**: Always include relevant context information
3. **Use Appropriate Levels**: Choose the correct log level for the message
4. **Structured Data**: Use structured data in the `details` field
5. **Avoid Sensitive Data**: Never log sensitive data like passwords or tokens
6. **Correlation IDs**: Always include trace/correlation IDs for distributed tracing
7. **Categorize Correctly**: Use appropriate categories for easier filtering
8. **Be Descriptive**: Write clear, descriptive messages

## Related Documentation

- **[LOG_FORMAT_STANDARDIZATION.md](LOG_FORMAT_STANDARDIZATION.md)**: Standardized log format overview
- **[LOG_FORMAT_CORE.md](LOG_FORMAT_CORE.md)**: Core log format structure
- **[LOG_FORMAT_INTERFACES.md](LOG_FORMAT_INTERFACES.md)**: Interface definitions
- **[LOG_FORMAT_EXAMPLES.md](LOG_FORMAT_EXAMPLES.md)**: Implementation examples
- **[LOG_FORMAT_INTEGRATION.md](LOG_FORMAT_INTEGRATION.md)**: Integration with other systems
- **[../security/ERROR_HANDLING.md](../security/ERROR_HANDLING.md)**: Error handling standards

## Version History

- **1.0.0**: Initial document created from LOG_FORMAT_IMPLEMENTATION.md refactoring (2025-05-23)
