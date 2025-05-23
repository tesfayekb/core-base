
# Log Format Implementation Guidelines

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides implementation guidelines for the standardized log format defined in [LOG_FORMAT_CORE.md](LOG_FORMAT_CORE.md), including interfaces, example implementations, and usage patterns.

## Logging Service Interface

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

## Implementation Example

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

## Usage Examples

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

## Related Documentation

- **[LOG_FORMAT_STANDARDIZATION.md](LOG_FORMAT_STANDARDIZATION.md)**: Standardized log format overview
- **[LOG_FORMAT_CORE.md](LOG_FORMAT_CORE.md)**: Core log format structure
- **[LOG_FORMAT_SUBSYSTEMS.md](LOG_FORMAT_SUBSYSTEMS.md)**: Subsystem-specific log formats
- **[LOG_FORMAT_INTEGRATION.md](LOG_FORMAT_INTEGRATION.md)**: Integration with other systems
- **[../security/ERROR_HANDLING.md](../security/ERROR_HANDLING.md)**: Error handling standards

## Version History

- **1.0.0**: Initial document created from LOG_FORMAT_STANDARDIZATION.md refactoring (2025-05-23)
