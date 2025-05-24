
# Security Infrastructure Setup

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Step-by-step guide for implementing the security infrastructure with input validation and sanitization.

## Implementation Steps

### Step 1: Input Validation Setup

```typescript
// src/utils/validation.ts
import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters');

// Form validation example
export const userFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  tenantId: z.string().uuid('Invalid tenant ID')
});

// Validation function
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { isValid: boolean; data?: T; errors?: Record<string, string> } {
  try {
    const validatedData = schema.parse(data);
    return { isValid: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.reduce((acc, err) => {
        const path = err.path.join('.');
        acc[path] = err.message;
        return acc;
      }, {} as Record<string, string>);
      
      return { isValid: false, errors };
    }
    
    return { isValid: false, errors: { _general: 'Validation failed' } };
  }
}
```

### Step 2: Sanitization Setup

```typescript
// src/utils/sanitization.ts
import DOMPurify from 'dompurify';

// Sanitize HTML content
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html);
}

// Sanitize object fields recursively
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  
  Object.keys(result).forEach(key => {
    const value = result[key];
    
    if (typeof value === 'string') {
      result[key] = sanitizeHTML(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    }
  });
  
  return result;
}

// Sanitize form data
export function sanitizeFormData<T extends Record<string, any>>(formData: T): T {
  return sanitizeObject(formData);
}
```

### Step 3: Security Headers Setup

```typescript
// src/middleware/securityHeaders.ts
export function setSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Set security headers
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; object-src 'none';");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  
  next();
}
```

## Validation Steps

### Test Input Validation

```typescript
// Test validation
const formData = {
  email: 'test@example.com',
  password: 'Password123',
  name: 'Test User',
  tenantId: '12345678-1234-1234-1234-123456789012'
};

const result = validateInput(userFormSchema, formData);
console.log('Validation result:', result);
```

### Test Sanitization

```typescript
// Test sanitization
const unsafeHtml = '<script>alert("XSS")</script>Hello';
const safeHtml = sanitizeHTML(unsafeHtml);
console.log('Sanitized HTML:', safeHtml); // Should output 'Hello'
```

## Common Issues & Solutions

**Issue**: Validation errors not showing in UI
```typescript
// Solution: Map validation errors to form fields
function mapValidationErrorsToForm(errors: Record<string, string>) {
  return Object.entries(errors).reduce((acc, [key, message]) => {
    const formKey = key.split('.').pop() || key;
    acc[formKey] = message;
    return acc;
  }, {} as Record<string, string>);
}
```

**Issue**: Over-aggressive sanitization removing legitimate content
```typescript
// Solution: Configure DOMPurify with appropriate options
DOMPurify.setConfig({
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href', 'target', 'rel']
});
```

## Next Steps

- Proceed to [MULTI_TENANT_SETUP.md](MULTI_TENANT_SETUP.md) for multi-tenant foundation setup
- Review [../testing/SECURITY_TESTING.md](../testing/SECURITY_TESTING.md) for security testing

## Version History

- **1.0.0**: Initial security infrastructure guide (2025-05-23)
