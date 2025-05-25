
// Security pattern detection utilities
// Extracted from securityTesting.ts for better organization

export class SecurityPatternDetection {
  /**
   * Check if output contains executable script patterns
   */
  static containsExecutableScript(output: string): boolean {
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
  static containsSQLInjectionPattern(output: string): boolean {
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
