
export interface SecurityComplianceResult {
  httpsEnabled: boolean;
  headersApplied: boolean;
  cspActive: boolean;
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

  static checkSecurityCompliance(): SecurityComplianceResult {
    const httpsEnabled = this.validateHTTPS();
    const headersApplied = !!document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const cspActive = this.isCSPActive();
    
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

    return {
      httpsEnabled,
      headersApplied,
      cspActive,
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
