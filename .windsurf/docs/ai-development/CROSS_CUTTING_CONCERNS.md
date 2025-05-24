
# Cross-Cutting Concerns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

This document outlines implementation approaches for cross-cutting concerns that span multiple system components.

## Audit Logging Pattern

1. **[../audit/README.md](../audit/README.md)**: Audit logging overview
2. **[../audit/LOG_FORMAT_STANDARDIZATION.md](../audit/LOG_FORMAT_STANDARDIZATION.md)**: Standardized log format
3. **[../audit/PII_PROTECTION.md](../audit/PII_PROTECTION.md)**: Protecting sensitive data in logs

```typescript
// Audit logging implementation pattern
interface AuditEvent {
  eventType: string;
  userId: string;
  tenantId?: string;
  resource?: string;
  action?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

async function logAuditEvent(event: AuditEvent): Promise<void> {
  // 1. Apply timestamp if not provided
  const timestampedEvent = {
    ...event,
    timestamp: event.timestamp || new Date()
  };
  
  // 2. Sanitize PII from metadata
  const sanitizedEvent = sanitizeEventPII(timestampedEvent);
  
  // 3. Format according to standards
  const formattedEvent = formatStandardLog(sanitizedEvent);
  
  // 4. Store in appropriate storage
  await auditStorage.store(formattedEvent);
  
  // 5. Emit event for real-time monitoring if configured
  if (config.realTimeAuditMonitoring) {
    auditEventEmitter.emit('audit', formattedEvent);
  }
}
```

## Error Handling Pattern

1. **[../security/ERROR_HANDLING.md](../security/ERROR_HANDLING.md)**: Security-focused error handling
2. **[../user-management/ERROR_HANDLING.md](../user-management/ERROR_HANDLING.md)**: User-facing error handling

```typescript
// Standardized error handling pattern
interface ErrorContext {
  userId?: string;
  tenantId?: string;
  requestId: string;
  source: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  publicMessage?: string;
}

class AppError extends Error {
  public readonly context: ErrorContext;
  public readonly originalError?: Error;
  
  constructor(message: string, context: ErrorContext, originalError?: Error) {
    super(message);
    this.context = context;
    this.originalError = originalError;
    this.name = this.constructor.name;
    
    // Log error based on severity
    if (context.severity === 'critical') {
      logCriticalError(this);
    } else {
      logStandardError(this);
    }
  }
  
  public toPublicResponse(): { message: string; requestId: string } {
    return {
      message: this.context.publicMessage || 'An error occurred',
      requestId: this.context.requestId
    };
  }
}
```

## Form Validation Pattern

1. **[../implementation/FORM_SANITIZATION_ARCHITECTURE.md](../implementation/FORM_SANITIZATION_ARCHITECTURE.md)**: Form sanitization
2. **[../security/INPUT_VALIDATION.md](../security/INPUT_VALIDATION.md)**: Security-focused input validation

```typescript
// Form validation implementation pattern
interface ValidationSchema<T> {
  fields: {
    [K in keyof T]: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      customValidator?: (value: T[K]) => boolean | Promise<boolean>;
    }
  };
}

async function validateForm<T>(data: T, schema: ValidationSchema<T>): Promise<ValidationResult> {
  const errors: Record<string, string> = {};
  
  for (const [field, rules] of Object.entries(schema.fields)) {
    const value = data[field as keyof T];
    
    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} is required`;
      continue;
    }
    
    // Skip further validation if field is empty and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }
    
    // String validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors[field] = `${field} must be at least ${rules.minLength} characters`;
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        errors[field] = `${field} must be no more than ${rules.maxLength} characters`;
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        errors[field] = `${field} format is invalid`;
      }
    }
    
    // Custom validation
    if (rules.customValidator) {
      const isValid = await Promise.resolve(rules.customValidator(value));
      if (!isValid) {
        errors[field] = `${field} is invalid`;
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
```

## Related Documentation

- **[../implementation/AUDIT_INTEGRATION_CHECKLIST.md](../implementation/AUDIT_INTEGRATION_CHECKLIST.md)**: Audit requirements
- **[../security/SECURE_DEVELOPMENT.md](../security/SECURE_DEVELOPMENT.md)**: Secure development practices
- **[../TEST_FRAMEWORK.md](../TEST_FRAMEWORK.md)**: Testing approach

## Version History

- **1.0.0**: Initial cross-cutting concerns guide (2025-05-23)
