
# Log Format Interfaces

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document defines the core interfaces for implementing the standardized log format defined in [LOG_FORMAT_CORE.md](LOG_FORMAT_CORE.md), focusing on the interfaces that all subsystems must implement.

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

## Context Provider Interface

Components that need to generate logging context can implement:

```typescript
interface LoggingContextProvider {
  getLoggingContext(): Record<string, any>;
}
```

## Related Documentation

- **[LOG_FORMAT_STANDARDIZATION.md](LOG_FORMAT_STANDARDIZATION.md)**: Standardized log format overview
- **[LOG_FORMAT_CORE.md](LOG_FORMAT_CORE.md)**: Core log format structure
- **[LOG_FORMAT_EXAMPLES.md](LOG_FORMAT_EXAMPLES.md)**: Implementation examples
- **[LOG_FORMAT_USAGE.md](LOG_FORMAT_USAGE.md)**: Usage patterns and best practices
- **[LOG_FORMAT_INTEGRATION.md](LOG_FORMAT_INTEGRATION.md)**: Integration with other systems

## Version History

- **1.0.0**: Initial document created from LOG_FORMAT_IMPLEMENTATION.md refactoring (2025-05-23)
