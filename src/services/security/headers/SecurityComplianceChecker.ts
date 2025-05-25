
export interface SecurityComplianceResult {
  httpsEnabled: boolean;
  headersApplied: boolean;
  cspActive: boolean;
  hstsActive: boolean;
  hstsConfiguration: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  recommendations: string[];
}

export class SecurityComplianceChecker {
  static validateHTTPS(): boolean {
    const isHTTPS = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.endsWith('.localhost');

    if (!isHTTPS && !isLocalhost) {
      console.warn('⚠️ Application is not running over HTTPS in production environment');
      return false;
    }

    return true;
  }

  static validateHSTS(): { active: boolean; configuration: any } {
    // Check if HSTS meta tag is present
    const hstsMetaTag = document.querySelector('meta[http-equiv="Strict-Transport-Security"]');
    
    if (!hstsMetaTag) {
      return { 
        active: false, 
        configuration: { maxAge: 0, includeSubDomains: false, preload: false }
      };
    }

    const hstsValue = hstsMetaTag.getAttribute('content') || '';
    
    // Parse HSTS configuration
    const maxAgeMatch = hstsValue.match(/max-age=(\d+)/);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : 0;
    const includeSubDomains = hstsValue.includes('includeSubDomains');
    const preload = hstsValue.includes('preload');

    return {
      active: maxAge > 0,
      configuration: { maxAge, includeSubDomains, preload }
    };
  }

  static checkSecurityCompliance(): SecurityComplianceResult {
    const httpsEnabled = this.validateHTTPS();
    const headersApplied = !!document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const cspActive = this.isCSPActive();
    const hstsValidation = this.validateHSTS();
    
    const recommendations: string[] = [];
    
    if (!httpsEnabled) {
      recommendations.push('Enable HTTPS for production deployment');
    }
    
    if (!headersApplied) {
      recommendations.push('Apply security headers');
    }
    
    if (!cspActive) {
      recommendations.push('Ensure Content Security Policy is active');
    }

    if (!hstsValidation.active) {
      recommendations.push('Configure HTTP Strict Transport Security (HSTS)');
    } else {
      const config = hstsValidation.configuration;
      if (config.maxAge < 31536000) {
        recommendations.push('Increase HSTS max-age to at least 1 year (31536000 seconds)');
      }
      if (!config.includeSubDomains) {
        recommendations.push('Enable HSTS includeSubDomains directive');
      }
      if (!config.preload) {
        recommendations.push('Consider enabling HSTS preload for maximum security');
      }
    }

    return {
      httpsEnabled,
      headersApplied,
      cspActive,
      hstsActive: hstsValidation.active,
      hstsConfiguration: hstsValidation.configuration,
      recommendations
    };
  }

  private static isCSPActive(): boolean {
    try {
      // Try to execute a simple inline script to test CSP
      const script = document.createElement('script');
      script.textContent = 'window.__cspTest = true;';
      document.head.appendChild(script);
      document.head.removeChild(script);
      
      const cspActive = !(window as any).__cspTest;
      delete (window as any).__cspTest;
      
      return cspActive;
    } catch (error) {
      return true; // CSP is likely active if script execution failed
    }
  }
}
