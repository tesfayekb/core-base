
import { SecurityTester } from '../securityTesting';

export class SecurityTestRunner {
  static async runAllTests(): Promise<{
    passed: boolean;
    results: any[];
    summary: string;
  }> {
    const report = SecurityTester.generateSecurityReport();
    
    return {
      passed: report.summary.vulnerabilitiesFound === 0,
      results: [
        report.details.xssTests,
        report.details.sqlInjectionTests,
        report.details.authTests
      ],
      summary: `Tests run: ${report.summary.testsRun}, Passed: ${report.summary.testsPassed}`
    };
  }

  static async testFormSecurity(formData: Record<string, any>): Promise<boolean> {
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string') {
        if (!SecurityTester.testXSSVulnerabilities(value)) {
          console.warn(`XSS vulnerability detected in field: ${key}`);
          return false;
        }
        if (!SecurityTester.testSQLInjection(value)) {
          console.warn(`SQL injection attempt detected in field: ${key}`);
          return false;
        }
      }
    }
    return true;
  }
}
