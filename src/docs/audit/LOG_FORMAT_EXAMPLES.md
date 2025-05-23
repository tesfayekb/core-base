
# Log Format Implementation Examples

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides concrete implementation examples for the standardized log format defined in [LOG_FORMAT_CORE.md](LOG_FORMAT_CORE.md) and the interfaces specified in [LOG_FORMAT_INTERFACES.md](LOG_FORMAT_INTERFACES.md).

## Standard Logger Implementation

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

## Context Provider Example

```typescript
class RequestContextProvider implements LoggingContextProvider {
  constructor(private req: Request) {}
  
  getLoggingContext(): Record<string, any> {
    return {
      requestId: this.req.id,
      sessionId: this.req.session?.id,
      ip: this.req.ip,
      userAgent: this.req.headers['user-agent'],
      url: this.req.url,
      method: this.req.method
    };
  }
}
```

## Related Documentation

- **[LOG_FORMAT_STANDARDIZATION.md](LOG_FORMAT_STANDARDIZATION.md)**: Standardized log format overview
- **[LOG_FORMAT_CORE.md](LOG_FORMAT_CORE.md)**: Core log format structure
- **[LOG_FORMAT_INTERFACES.md](LOG_FORMAT_INTERFACES.md)**: Interface definitions
- **[LOG_FORMAT_USAGE.md](LOG_FORMAT_USAGE.md)**: Usage patterns and best practices
- **[LOG_FORMAT_INTEGRATION.md](LOG_FORMAT_INTEGRATION.md)**: Integration with other systems
- **[../security/ERROR_HANDLING.md](../security/ERROR_HANDLING.md)**: Error handling standards

## Version History

- **1.0.0**: Initial document created from LOG_FORMAT_IMPLEMENTATION.md refactoring (2025-05-23)
