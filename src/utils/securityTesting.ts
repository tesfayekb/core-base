
import { sanitizeHTML, sanitizeText, sanitizeObject, escapeSQLString, sanitizeURL } from './sanitization';
import { validateInput } from './validation';
import { z } from 'zod';

// XSS test vectors
const XSS_TEST_VECTORS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  'javascript:alert("XSS")',
  '<svg onload=alert("XSS")>',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>',
  '<body onload=alert("XSS")>',
  '<div onclick=alert("XSS")>Click me</div>',
  '<a href="javascript:alert(\'XSS\')">Click</a>',
  '"><script>alert("XSS")</script>',
  '\';alert("XSS");//',
  '<object data="javascript:alert(\'XSS\')"></object>'
];

// SQL injection test vectors
const SQL_INJECTION_TEST_VECTORS = [
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  "'; DELETE FROM users WHERE 't'='t",
  "' UNION SELECT password FROM users--",
  "admin'--",
  "admin' OR 1=1--",
  "' OR 1=1#",
  "'; INSERT INTO users VALUES('hacker','pass');--",
  "1' AND 1=1",
  "1' OR 1=1",
  "'; EXEC xp_cmdshell('dir');--"
];

export interface SecurityTestResult {
  testType: 'XSS' | 'SQL_INJECTION';
  inputVector: string;
  sanitizedOutput: string;
  isPrevented: boolean;
  vulnerabilityFound: boolean;
  details: string;
}

export class SecurityTester {
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
        isPrevented: !this.containsExecutableScript(htmlResult),
        vulnerabilityFound: this.containsExecutableScript(htmlResult),
        details: `HTML sanitization test for: ${vector}`
      });

      // Test text sanitization
      const textResult = sanitizeText(vector);
      results.push({
        testType: 'XSS',
        inputVector: vector,
        sanitizedOutput: textResult,
        isPrevented: !this.containsExecutableScript(textResult),
        vulnerabilityFound: this.containsExecutableScript(textResult),
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
        isPrevented: !this.containsSQLInjectionPattern(escapedResult),
        vulnerabilityFound: this.containsSQLInjectionPattern(escapedResult),
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
          isPrevented: !this.containsExecutableScript(sanitizedValue),
          vulnerabilityFound: this.containsExecutableScript(sanitizedValue),
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

  /**
   * Generate comprehensive security test report
   */
  static generateSecurityReport(): {
    summary: {
      totalTests: number;
      vulnerabilitiesFound: number;
      preventionRate: number;
    };
    xssResults: SecurityTestResult[];
    sqlResults: SecurityTestResult[];
    objectResults: SecurityTestResult[];
    formResults: SecurityTestResult[];
  } {
    const xssResults = this.testXSSPrevention();
    const sqlResults = this.testSQLInjectionPrevention();
    const objectResults = this.testObjectSanitization();
    const formResults = this.testFormValidationSecurity();

    const allResults = [...xssResults, ...sqlResults, ...objectResults, ...formResults];
    const vulnerabilitiesFound = allResults.filter(r => r.vulnerabilityFound).length;
    const totalTests = allResults.length;
    const preventionRate = ((totalTests - vulnerabilitiesFound) / totalTests) * 100;

    return {
      summary: {
        totalTests,
        vulnerabilitiesFound,
        preventionRate: Math.round(preventionRate * 100) / 100
      },
      xssResults,
      sqlResults,
      objectResults,
      formResults
    };
  }

  /**
   * Check if output contains executable script patterns
   */
  private static containsExecutableScript(output: string): boolean {
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^>]*src\s*=\s*["']?javascript:/gi,
      /<object\b[^>]*data\s*=\s*["']?javascript:/gi
    ];

    return dangerousPatterns.some(pattern => pattern.test(output));
  }

  /**
   * Check if output contains SQL injection patterns
   */
  private static containsSQLInjectionPattern(output: string): boolean {
    const sqlPatterns = [
      /;\s*(drop|delete|insert|update|select)\s+/gi,
      /'\s*or\s*'?\d*'?\s*=\s*'?\d*'?/gi,
      /union\s+select/gi,
      /exec\s+xp_/gi,
      /--/g,
      /#/g
    ];

    return sqlPatterns.some(pattern => pattern.test(output));
  }
}

// Export convenience functions
export const testXSSPrevention = () => SecurityTester.testXSSPrevention();
export const testSQLInjectionPrevention = () => SecurityTester.testSQLInjectionPrevention();
export const generateSecurityReport = () => SecurityTester.generateSecurityReport();
