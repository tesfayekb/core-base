
import DOMPurify from 'dompurify';

interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
}

interface SanitizationOptions {
  allowHtml?: boolean;
  maxLength?: number;
  allowedTags?: string[];
  stripWhitespace?: boolean;
}

export class InputValidationService {
  private static instance: InputValidationService;

  static getInstance(): InputValidationService {
    if (!InputValidationService.instance) {
      InputValidationService.instance = new InputValidationService();
    }
    return InputValidationService.instance;
  }

  private constructor() {}

  // XSS Prevention - sanitize HTML content
  sanitizeHtml(input: string, options: SanitizationOptions = {}): string {
    const config = {
      ALLOWED_TAGS: options.allowedTags || ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: ['href', 'title', 'alt'],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover']
    };

    return DOMPurify.sanitize(input, config);
  }

  // General input sanitization
  sanitizeInput(input: string, options: SanitizationOptions = {}): ValidationResult {
    const errors: string[] = [];
    let sanitized = input;

    // Strip whitespace if requested
    if (options.stripWhitespace) {
      sanitized = sanitized.trim();
    }

    // Check length constraints
    if (options.maxLength && sanitized.length > options.maxLength) {
      errors.push(`Input exceeds maximum length of ${options.maxLength} characters`);
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // Remove potentially dangerous patterns
    sanitized = this.removeDangerousPatterns(sanitized);

    // HTML sanitization if needed
    if (options.allowHtml) {
      sanitized = this.sanitizeHtml(sanitized, options);
    } else {
      // Escape HTML entities
      sanitized = this.escapeHtml(sanitized);
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    };
  }

  // SQL Injection Prevention
  sanitizeForDatabase(input: string): string {
    return input
      .replace(/(\b)(union|select|insert|update|delete|drop|alter|exec|execute)(\b)/gi, 
              (match) => match.split('').join('\u200B'))
      .replace(/--/g, '&#45;&#45;')
      .replace(/;/g, '&#59;')
      .replace(/'/g, '&#39;')
      .replace(/"/g, '&#34;');
  }

  // Email validation
  validateEmail(email: string): ValidationResult {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const errors: string[] = [];

    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    if (email.length > 254) {
      errors.push('Email address too long');
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: email.toLowerCase().trim(),
      errors
    };
  }

  // Password validation
  validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: password, // Don't sanitize passwords
      errors
    };
  }

  // URL validation and sanitization
  validateUrl(url: string): ValidationResult {
    const errors: string[] = [];
    let sanitized = url.trim();

    try {
      const urlObj = new URL(sanitized);
      
      // Only allow safe protocols
      const allowedProtocols = ['http:', 'https:', 'mailto:'];
      if (!allowedProtocols.includes(urlObj.protocol)) {
        errors.push('URL protocol not allowed');
      }

      // Remove dangerous parameters
      urlObj.searchParams.delete('javascript');
      urlObj.searchParams.delete('data');
      
      sanitized = urlObj.toString();
    } catch (error) {
      errors.push('Invalid URL format');
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors
    };
  }

  private removeDangerousPatterns(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '')
      .replace(/vbscript:/gi, '');
  }

  private escapeHtml(input: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    };

    return input.replace(/[&<>"'\/]/g, (s) => map[s]);
  }
}

export const inputValidationService = InputValidationService.getInstance();
