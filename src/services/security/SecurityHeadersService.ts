
interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security': string;
}

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
    return {
      'Content-Security-Policy': this.getCSPHeader(),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': this.getPermissionsPolicyHeader(),
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    };
  }

  private getCSPHeader(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ];

    return directives.join('; ');
  }

  private getPermissionsPolicyHeader(): string {
    // Granular permissions policy for enterprise security
    const policies = [
      // Location and sensors - completely disabled for privacy
      'geolocation=()',
      'accelerometer=()',
      'gyroscope=()',
      'magnetometer=()',
      
      // Media devices - allow self-origin only for potential video calls
      'camera=(self)',
      'microphone=(self)',
      'speaker-selection=(self)',
      
      // Display and UI - controlled access
      'display-capture=(self)',
      'fullscreen=(self)',
      'picture-in-picture=(self)',
      'screen-wake-lock=(self)',
      
      // Payment and commerce - disabled for security
      'payment=()',
      
      // Device access - disabled for security
      'usb=()',
      'serial=()',
      'bluetooth=()',
      'hid=()',
      
      // Storage and data - allow self-origin
      'storage-access=(self)',
      'interest-cohort=()',
      
      // Performance and resources
      'execution-while-not-rendered=(self)',
      'execution-while-out-of-viewport=(self)',
      
      // Navigation and browsing
      'navigation-override=(self)',
      'focus-without-user-activation=()',
      
      // Experimental features - disabled by default
      'ambient-light-sensor=()',
      'battery=()',
      'web-share=(self)',
      'xr-spatial-tracking=()',
      
      // Advertising and tracking - disabled
      'browsing-topics=()',
      'join-ad-interest-group=()',
      'run-ad-auction=()'
    ];

    return policies.join(', ');
  }

  applySecurityHeaders(): void {
    // Apply headers to document for client-side security
    const headers = this.getSecurityHeaders();
    
    // Set meta tags for CSP (fallback for client-side)
    this.setMetaTag('Content-Security-Policy', headers['Content-Security-Policy']);
    this.setMetaTag('X-Content-Type-Options', headers['X-Content-Type-Options']);
    this.setMetaTag('Referrer-Policy', headers['Referrer-Policy']);
    this.setMetaTag('Permissions-Policy', headers['Permissions-Policy']);

    console.log('🛡️ Security headers applied with granular permissions policy');
  }

  private setMetaTag(name: string, content: string): void {
    let meta = document.querySelector(`meta[http-equiv="${name}"]`) as HTMLMetaElement;
    
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('http-equiv', name);
      document.head.appendChild(meta);
    }
    
    meta.setAttribute('content', content);
  }

  validateHTTPS(): boolean {
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

  checkSecurityCompliance(): {
    httpsEnabled: boolean;
    headersApplied: boolean;
    cspActive: boolean;
    recommendations: string[];
  } {
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

  private isCSPActive(): boolean {
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

  // New method to get granular permissions info
  getPermissionsPolicyDetails(): Record<string, string> {
    return {
      'Location Services': 'Completely disabled for privacy protection',
      'Media Devices': 'Camera/microphone allowed for self-origin only',
      'Sensors': 'All motion sensors disabled',
      'Payment APIs': 'Disabled for security',
      'Device Access': 'USB, Bluetooth, Serial access disabled',
      'Storage': 'Storage access allowed for self-origin',
      'Display Controls': 'Fullscreen and display capture allowed for self',
      'Tracking': 'All advertising and tracking features disabled'
    };
  }
}

export const securityHeadersService = SecurityHeadersService.getInstance();
