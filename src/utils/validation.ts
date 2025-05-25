
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
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters');

export const tenantIdSchema = z.string().uuid('Invalid tenant ID');

// Form validation schemas
export const userFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  tenantId: tenantIdSchema.optional()
});

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
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

// Sanitization using built-in browser APIs
export function sanitizeText(input: string): string {
  // Create a temporary div element to leverage browser's built-in HTML parsing
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// Sanitize object fields recursively (fixed generic type handling)
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result = {} as T;
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    if (typeof value === 'string') {
      (result as any)[key] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      (result as any)[key] = sanitizeObject(value);
    } else {
      (result as any)[key] = value;
    }
  });
  
  return result;
}

// Validate and sanitize form data
export function validateAndSanitizeForm<T>(
  schema: z.ZodSchema<T>,
  formData: Record<string, any>
): { isValid: boolean; data?: T; errors?: Record<string, string> } {
  // First sanitize the input
  const sanitizedData = sanitizeObject(formData);
  
  // Then validate
  return validateInput(schema, sanitizedData);
}
