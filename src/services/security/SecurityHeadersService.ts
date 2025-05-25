
import { SecurityHeadersConfig, SecurityHeaders } from './headers/SecurityHeadersConfig';
import { SecurityComplianceChecker, SecurityComplianceResult } from './headers/SecurityComplianceChecker';
import { MetaTagManager } from './headers/MetaTagManager';

export class SecurityHeadersService {
  private static instance: SecurityHeadersService;

  static getInstance(): SecurityHeadersService {
    if (!SecurityHeadersService.instance) {
      SecurityHeadersService.instance = new SecurityHeadersService();
    }
    return SecurityHeadersService.instance;
  }

  private constructor() {}

  getSecurityHeaders(): SecurityHeaders {
    return SecurityHeadersConfig.getSecurityHeaders();
  }

  applySecurityHeaders(): void {
    const headers = this.getSecurityHeaders();
    MetaTagManager.applySecurityHeaders(headers);
  }

  validateHTTPS(): boolean {
    return SecurityComplianceChecker.validateHTTPS();
  }

  checkSecurityCompliance(): SecurityComplianceResult {
    return SecurityComplianceChecker.checkSecurityCompliance();
  }

  getPermissionsPolicyDetails(): Record<string, string> {
    return SecurityHeadersConfig.getPermissionsPolicyDetails();
  }

  getHSTSDetails(): Record<string, string> {
    return SecurityHeadersConfig.getHSTSDetails();
  }

  validateHSTSConfiguration(): { active: boolean; configuration: any } {
    return SecurityComplianceChecker.validateHSTS();
  }
}

export const securityHeadersService = SecurityHeadersService.getInstance();
export type { SecurityHeaders, SecurityComplianceResult };
