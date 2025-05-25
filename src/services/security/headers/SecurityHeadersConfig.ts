
export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security': string;
}

export class SecurityHeadersConfig {
  static getCSPHeader(): string {
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

  static getPermissionsPolicyHeader(): string {
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

  static getSecurityHeaders(): SecurityHeaders {
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

  static getPermissionsPolicyDetails(): Record<string, string> {
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
