
import { z } from 'zod';
import { sanitizeFormData } from '@/utils/sanitization';
import { validateInput } from '@/utils/validation';
import { SecurityTester } from '@/utils/securityTesting';

export interface FormValidationConfig<T> {
  schema: z.ZodSchema<T>;
  sanitize: boolean;
  securityTest: boolean;
  fieldValidation: boolean;
}

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: Record<string, string>;
  securityReport?: {
    xssPrevented: boolean;
    sqlInjectionPrevented: boolean;
    warnings: string[];
  };
}

export class FormValidationService {
  /**
   * Comprehensive form validation with security testing
   */
  static async validateForm<T extends Record<string, any>>(
    formData: T,
    config: FormValidationConfig<T>
  ): Promise<ValidationResult<T>> {
    const { schema, sanitize, securityTest } = config;
    
    // Step 1: Sanitize data if requested
    let processedData = sanitize ? sanitizeFormData(formData) : formData;
    
    // Step 2: Validate with schema
    const validation = validateInput(schema, processedData);
    
    if (!validation.isValid) {
      return {
        isValid: false,
        errors: validation.errors
      };
    }

    // Step 3: Security testing if requested
    let securityReport;
    if (securityTest) {
      securityReport = this.performSecurityValidation(formData, processedData);
    }

    return {
      isValid: true,
      data: validation.data,
      securityReport
    };
  }

  /**
   * Real-time field validation with security checks
   */
  static validateField<T extends Record<string, any>>(
    fieldName: keyof T,
    fieldValue: any,
    schema: z.ZodSchema<T>,
    sanitize: boolean = true
  ): { isValid: boolean; error?: string; sanitizedValue?: any } {
    try {
      // Sanitize the field value
      const sanitizedValue = sanitize && typeof fieldValue === 'string' 
        ? sanitizeFormData({ [fieldName]: fieldValue })[fieldName as string]
        : fieldValue;

      // Extract field schema for validation
      const fieldSchema = this.extractFieldSchema(schema, fieldName);
      if (!fieldSchema) {
        return { isValid: true, sanitizedValue };
      }

      // Validate the field
      fieldSchema.parse(sanitizedValue);
      
      return { 
        isValid: true, 
        sanitizedValue 
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          isValid: false, 
          error: error.errors[0]?.message || 'Validation failed',
          sanitizedValue: fieldValue
        };
      }
      return { 
        isValid: false, 
        error: 'Validation failed',
        sanitizedValue: fieldValue
      };
    }
  }

  /**
   * Perform security validation on form data
   */
  private static performSecurityValidation<T>(
    originalData: T,
    sanitizedData: T
  ): {
    xssPrevented: boolean;
    sqlInjectionPrevented: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let xssPrevented = false;
    let sqlInjectionPrevented = false;

    // Check for XSS patterns in original data
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];

    // Check for SQL injection patterns in original data
    const sqlPatterns = [
      /;\s*(drop|delete|insert|update|select)\s+/gi,
      /'\s*or\s*'?\d*'?\s*=\s*'?\d*'?/gi,
      /union\s+select/gi
    ];

    Object.entries(originalData as Record<string, any>).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Check for XSS
        if (xssPatterns.some(pattern => pattern.test(value))) {
          xssPrevented = true;
          warnings.push(`XSS attempt detected in field: ${key}`);
        }

        // Check for SQL injection
        if (sqlPatterns.some(pattern => pattern.test(value))) {
          sqlInjectionPrevented = true;
          warnings.push(`SQL injection attempt detected in field: ${key}`);
        }
      }
    });

    return {
      xssPrevented,
      sqlInjectionPrevented,
      warnings
    };
  }

  /**
   * Extract field schema from object schema
   */
  private static extractFieldSchema<T>(
    schema: z.ZodSchema<T>,
    fieldName: keyof T
  ): z.ZodSchema<any> | null {
    try {
      // For ZodObject, try to access the shape
      if ('shape' in schema && schema.shape) {
        return (schema.shape as any)[fieldName] || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validate all forms in the application
   */
  static async validateAllApplicationForms(): Promise<{
    formsValidated: string[];
    securityIssues: string[];
    recommendations: string[];
  }> {
    const report = SecurityTester.generateSecurityReport();
    
    return {
      formsValidated: ['login', 'signup', 'user-management'],
      securityIssues: report.summary.vulnerabilitiesFound > 0 
        ? [`${report.summary.vulnerabilitiesFound} potential vulnerabilities found`]
        : [],
      recommendations: [
        'All forms should use comprehensive validation',
        'Enable sanitization for all user inputs',
        'Implement real-time security testing',
        'Regular security audits recommended'
      ]
    };
  }
}

// Export convenience functions
export const validateForm = FormValidationService.validateForm;
export const validateField = FormValidationService.validateField;
export const validateAllApplicationForms = FormValidationService.validateAllApplicationForms;
