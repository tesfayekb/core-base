
// Security test execution and reporting
// Extracted from securityTesting.ts for better organization

import { sanitizeHTML, sanitizeText, sanitizeObject, escapeSQLString, sanitizeURL } from '../sanitization';
import { validateInput } from '../validation';
import { z } from 'zod';
import { XSS_TEST_VECTORS, SQL_INJECTION_TEST_VECTORS } from './SecurityTestVectors';
import { SecurityPatternDetection } from './SecurityPatternDetection';

export interface SecurityTestResult {
  testType: 'XSS' | 'SQL_INJECTION';
  inputVector: string;
  sanitizedOutput: string;
  isPrevented: boolean;
  vulnerabilityFound: boolean;
  details: string;
}

export class SecurityTestRunner {
  /**
   * Test XSS prevention across all sanitization functions
   */
  static testXSSPrevention(): SecurityTestResult[] {
    const results: SecurityTestResult[] = [];

    XSS_TEST_VECTORS.forEach(vector => {
      // Test HTML sanitization
      const htmlResult = sanitizeHTML(vector);
      results.push({
        testType: 'XSS',
        inputVector: vector,
        sanitizedOutput: htmlResult,
        isPrevented: !SecurityPatternDetection.containsExecutableScript(htmlResult),
        vulnerabilityFound: SecurityPatternDetection.containsExecutableScript(htmlResult),
        details: `HTML sanitization test for: ${vector}`
      });

      // Test text sanitization
      const textResult = sanitizeText(vector);
      results.push({
        testType: 'XSS',
        inputVector: vector,
        sanitizedOutput: textResult,
        isPrevented: !SecurityPatternDetection.containsExecutableScript(textResult),
        vulnerabilityFound: SecurityPatternDetection.containsExecutableScript(textResult),
        details: `Text sanitization test for: ${vector}`
      });

      // Test URL sanitization
      if (vector.includes('javascript:') || vector.includes('data:')) {
        const urlResult = sanitizeURL(vector);
        results.push({
          testType: 'XSS',
          inputVector: vector,
          sanitizedOutput: urlResult,
          isPrevented: urlResult === '',
          vulnerabilityFound: urlResult !== '',
          details: `URL sanitization test for: ${vector}`
        });
      }
    });

    return results;
  }

  /**
   * Test SQL injection prevention
   */
  static testSQLInjectionPrevention(): SecurityTestResult[] {
    const results: SecurityTestResult[] = [];

    SQL_INJECTION_TEST_VECTORS.forEach(vector => {
      const escapedResult = escapeSQLString(vector);
      results.push({
        testType: 'SQL_INJECTION',
        inputVector: vector,
        sanitizedOutput: escapedResult,
        isPrevented: !SecurityPatternDetection.containsSQLInjectionPattern(escapedResult),
        vulnerabilityFound: SecurityPatternDetection.containsSQLInjectionPattern(escapedResult),
        details: `SQL injection test for: ${vector}`
      });
    });

    return results;
  }

  /**
   * Test object sanitization with nested XSS attempts
   */
  static testObjectSanitization(): SecurityTestResult[] {
    const results: SecurityTestResult[] = [];
    
    const testObject = {
      name: '<script>alert("XSS")</script>John',
      email: 'test@example.com<img src=x onerror=alert("XSS")>',
      bio: 'Hello <svg onload=alert("XSS")> world',
      nested: {
        description: '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        tags: ['<script>alert("XSS")</script>', 'normal-tag']
      }
    };

    const sanitizedObject = sanitizeObject(testObject);
    
    // Check each field for XSS prevention
    Object.entries(testObject).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const sanitizedValue = (sanitizedObject as any)[key];
        results.push({
          testType: 'XSS',
          inputVector: value,
          sanitizedOutput: sanitizedValue,
          isPrevented: !SecurityPatternDetection.containsExecutableScript(sanitizedValue),
          vulnerabilityFound: SecurityPatternDetection.containsExecutableScript(sanitizedValue),
          details: `Object field sanitization test for: ${key}`
        });
      }
    });

    return results;
  }

  /**
   * Run comprehensive form validation security tests
   */
  static testFormValidationSecurity(): SecurityTestResult[] {
    const results: SecurityTestResult[] = [];
    
    // Test email field with XSS
    const emailSchema = z.string().email();
    XSS_TEST_VECTORS.forEach(vector => {
      const emailTest = `user${vector}@example.com`;
      const validation = validateInput(emailSchema, emailTest);
      
      results.push({
        testType: 'XSS',
        inputVector: emailTest,
        sanitizedOutput: validation.isValid ? 'VALIDATED' : 'REJECTED',
        isPrevented: !validation.isValid,
        vulnerabilityFound: validation.isValid,
        details: `Email validation security test for: ${vector}`
      });
    });

    return results;
  }
}
