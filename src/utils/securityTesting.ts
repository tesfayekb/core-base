
// Refactored Security Testing - Main orchestrator
// Now delegates to focused utility classes

import { SecurityTestRunner, SecurityTestResult } from './security/SecurityTestRunner';

export class SecurityTester {
  /**
   * Test XSS prevention across all sanitization functions
   */
  static testXSSPrevention = SecurityTestRunner.testXSSPrevention;

  /**
   * Test SQL injection prevention
   */
  static testSQLInjectionPrevention = SecurityTestRunner.testSQLInjectionPrevention;

  /**
   * Test object sanitization with nested XSS attempts
   */
  static testObjectSanitization = SecurityTestRunner.testObjectSanitization;

  /**
   * Run comprehensive form validation security tests
   */
  static testFormValidationSecurity = SecurityTestRunner.testFormValidationSecurity;

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
}

// Export convenience functions
export const testXSSPrevention = () => SecurityTester.testXSSPrevention();
export const testSQLInjectionPrevention = () => SecurityTester.testSQLInjectionPrevention();
export const generateSecurityReport = () => SecurityTester.generateSecurityReport();

// Re-export types
export type { SecurityTestResult } from './security/SecurityTestRunner';
