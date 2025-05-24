
# Form Sanitization Architecture

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document outlines the modular sanitization architecture implemented for form handling across the application. The sanitization system is designed to prevent XSS attacks, SQL injection, and other security vulnerabilities by providing specialized sanitization services for different contexts.

## Architecture Principles

1. **Separation of Concerns**: Different sanitization needs are handled by specialized services
2. **Defense in Depth**: Multiple layers of sanitization applied at different points
3. **Context-Awareness**: Sanitization strategies tailored to the context (HTML, database, URL, etc.)
4. **Schema Integration**: Leveraging validation schemas to apply appropriate sanitization
5. **Performance Optimization**: Targeted sanitization to minimize overhead

## Sanitization Service Structure

The sanitization architecture consists of a main orchestration service and several specialized services:

```
FormSanitizationService
├── SchemaSanitizationService
├── DatabaseSanitizationService
└── UrlSanitizationService
```

### FormSanitizationService

The main entry point for all form sanitization needs. It delegates to specialized services based on the sanitization context.

**Key Responsibilities**:
- Orchestrating the sanitization process
- Providing a unified API for sanitization
- Delegating to specialized services
- Handling sanitization errors
- Logging sanitization operations

### SchemaSanitizationService

Handles sanitization guided by Zod schemas, using type information to apply appropriate sanitization strategies.

**Key Responsibilities**:
- Extracting schema information
- Identifying field types
- Applying type-specific sanitization
- Handling nested structures
- Processing arrays and objects

### DatabaseSanitizationService

Focuses on sanitization specifically for database operations, with additional protections against SQL injection.

**Key Responsibilities**:
- Preventing SQL injection
- Sanitizing database-bound fields
- Adding database-specific escaping
- Handling SQL-specific patterns

### UrlSanitizationService

Specializes in sanitizing URL parameters and path segments.

**Key Responsibilities**:
- Sanitizing URL query parameters
- Handling path segments
- Preventing URL-based attacks
- Ensuring safe URL construction

## Integration Points

### Form Submission Flow

1. User submits form
2. Form data is validated using Zod schema
3. `FormSanitizationService.sanitizeFormData()` is called with data and schema
4. Appropriate sanitization is applied based on field types
5. Sanitized data is then used for API calls or state updates

### API Request Flow

1. API controller receives request data
2. Data is validated using Zod schema
3. `FormSanitizationService.sanitizeFormData()` is called
4. For database operations, `sanitizeForDatabase()` provides additional protection
5. Sanitized data is then used for database operations

### URL Parameter Handling

1. URL parameters are extracted from the request
2. `FormSanitizationService.sanitizeUrlParams()` is called
3. Sanitized parameters are used for processing

## Implementation Details

### Base Sanitization Functions

The architecture builds on three core sanitization functions:

- `sanitizeInput()`: General-purpose sanitization for string inputs
- `sanitizeHtml()`: Special handling for allowed HTML content
- `sanitizeObject()`: Recursive sanitization for objects

### Schema-Aware Sanitization

Schema-aware sanitization examines the Zod schema structure to apply the appropriate sanitization strategy:

```typescript
// Example of schema-aware sanitization
private static sanitizeWithSchema<T extends Record<string, any>>(
  data: T,
  schema: z.ZodSchema<T>
): T {
  const schemaShape = extractSchemaShape(schema);
  
  // Apply field-specific sanitization based on schema
  Object.entries(schemaShape).forEach(([key, fieldDef]) => {
    if (fieldDef.typeName === "ZodString") {
      if (isRichTextField(fieldDef)) {
        result[key] = sanitizeHtml(data[key]);
      } else {
        result[key] = sanitizeInput(data[key]);
      }
    }
    // Handle other types...
  });
  
  return result;
}
```

### Database-Specific Sanitization

Additional sanitization for database operations focuses on SQL injection prevention:

```typescript
// Example of database sanitization
static sanitizeForDatabase<T extends Record<string, any>>(data: T): T {
  const result = { ...data } as T;
  
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === "string") {
      // Remove SQL injection patterns
      const sanitized = value
        .replace(/(\b)(union|select|insert|update|delete|drop|alter)(\b)/gi, 
                (match) => match.split('').join('\u200B'))
        .replace(/--/g, '&#45;&#45;')
        .replace(/;/g, '&#59;');
        
      result[key] = sanitized;
    }
  });
  
  return result;
}
```

## Security Considerations

1. **No Sanitization Bypasses**: All user input must pass through sanitization
2. **Rich Text Handling**: HTML content requires special attention
3. **Consistent Application**: Sanitization must be applied consistently
4. **Error Handling**: Sanitization errors must not expose sensitive information
5. **Logging**: All sanitization operations must be logged for audit

## Related Documentation

- **[VALIDATION_SYSTEM.md](../../VALIDATION_SYSTEM.md)**: Validation system integration
- **[SECURITY_STANDARDS.md](../../SECURITY_STANDARDS.md)**: Security standards and practices
- **[FORM_SYSTEM_IMPLEMENTATION_PLAN.md](../../FORM_SYSTEM_IMPLEMENTATION_PLAN.md)**: Form system implementation details
- **[../security/INPUT_VALIDATION.md](../security/INPUT_VALIDATION.md)**: Input validation principles

## Version History

- **1.0.0**: Initial documentation of form sanitization architecture

