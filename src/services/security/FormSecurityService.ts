
import { inputValidationService } from './InputValidationService';
import { csrfProtectionService } from '../auth/CSRFProtectionService';

interface FormValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  type?: 'email' | 'password' | 'url' | 'text' | 'number';
  sanitize?: boolean;
  allowHtml?: boolean;
}

interface FormValidationSchema {
  [fieldName: string]: FormValidationRule;
}

interface FormValidationResult {
  isValid: boolean;
  sanitizedData: Record<string, any>;
  errors: Record<string, string[]>;
  csrfToken?: string;
}

export class FormSecurityService {
  private static instance: FormSecurityService;

  static getInstance(): FormSecurityService {
    if (!FormSecurityService.instance) {
      FormSecurityService.instance = new FormSecurityService();
    }
    return FormSecurityService.instance;
  }

  private constructor() {}

  // Comprehensive form validation with CSRF protection
  async validateForm(
    formData: Record<string, any>,
    schema: FormValidationSchema,
    requireCSRF: boolean = true
  ): Promise<FormValidationResult> {
    const errors: Record<string, string[]> = {};
    const sanitizedData: Record<string, any> = {};
    let isValid = true;

    // CSRF Token validation
    if (requireCSRF) {
      const csrfToken = formData._csrf || formData.csrfToken;
      if (!csrfToken || !csrfProtectionService.validateToken(csrfToken)) {
        errors._csrf = ['Invalid CSRF token'];
        isValid = false;
      }
    }

    // Validate each field according to schema
    for (const [fieldName, rules] of Object.entries(schema)) {
      const value = formData[fieldName];
      const fieldErrors: string[] = [];

      // Required field validation
      if (rules.required && (value === undefined || value === null || value === '')) {
        fieldErrors.push(`${fieldName} is required`);
        isValid = false;
        continue;
      }

      // Skip further validation if field is empty and not required
      if (value === undefined || value === null || value === '') {
        sanitizedData[fieldName] = value;
        continue;
      }

      // Type-specific validation
      let validationResult;
      switch (rules.type) {
        case 'email':
          validationResult = inputValidationService.validateEmail(value);
          break;
        case 'password':
          validationResult = inputValidationService.validatePassword(value);
          break;
        case 'url':
          validationResult = inputValidationService.validateUrl(value);
          break;
        default:
          validationResult = inputValidationService.sanitizeInput(value, {
            maxLength: rules.maxLength,
            allowHtml: rules.allowHtml,
            stripWhitespace: true
          });
      }

      if (!validationResult.isValid) {
        fieldErrors.push(...validationResult.errors);
        isValid = false;
      }

      // Length validation
      if (rules.minLength && value.length < rules.minLength) {
        fieldErrors.push(`${fieldName} must be at least ${rules.minLength} characters`);
        isValid = false;
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        fieldErrors.push(`${fieldName} format is invalid`);
        isValid = false;
      }

      // Store sanitized value
      sanitizedData[fieldName] = validationResult.sanitizedValue;

      // Store errors if any
      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors;
      }
    }

    return {
      isValid,
      sanitizedData,
      errors,
      csrfToken: requireCSRF ? csrfProtectionService.getCurrentToken() : undefined
    };
  }

  // Sanitize form data for database operations
  sanitizeForDatabase(formData: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string') {
        sanitized[key] = inputValidationService.sanitizeForDatabase(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // File upload security validation
  validateFileUpload(file: File, options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB default
    const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    const allowedExtensions = options.allowedExtensions || ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];

    // Size validation
    if (file.size > maxSize) {
      errors.push(`File size exceeds maximum limit of ${maxSize / 1024 / 1024}MB`);
    }

    // Type validation
    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not allowed');
    }

    // Extension validation
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      errors.push('File extension not allowed');
    }

    // Filename sanitization check
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      errors.push('Filename contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const formSecurityService = FormSecurityService.getInstance();
