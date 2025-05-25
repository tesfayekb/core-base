
import { SecurityHeaders } from './SecurityHeadersConfig';

export class MetaTagManager {
  static setMetaTag(name: string, content: string): void {
    let meta = document.querySelector(`meta[http-equiv="${name}"]`) as HTMLMetaElement;
    
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('http-equiv', name);
      document.head.appendChild(meta);
    }
    
    meta.setAttribute('content', content);
  }

  static applySecurityHeaders(headers: SecurityHeaders): void {
    // Set meta tags for CSP (fallback for client-side)
    this.setMetaTag('Content-Security-Policy', headers['Content-Security-Policy']);
    this.setMetaTag('X-Content-Type-Options', headers['X-Content-Type-Options']);
    this.setMetaTag('Referrer-Policy', headers['Referrer-Policy']);
    this.setMetaTag('Permissions-Policy', headers['Permissions-Policy']);

    console.log('🛡️ Security headers applied with granular permissions policy');
  }
}
