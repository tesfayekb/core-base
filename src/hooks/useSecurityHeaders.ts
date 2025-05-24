
import { useEffect, useState } from 'react';
import { securityHeadersService } from '@/services/security/SecurityHeadersService';

interface SecurityStatus {
  httpsEnabled: boolean;
  headersApplied: boolean;
  cspActive: boolean;
  recommendations: string[];
  isSecure: boolean;
}

export function useSecurityHeaders() {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    httpsEnabled: false,
    headersApplied: false,
    cspActive: false,
    recommendations: [],
    isSecure: false
  });

  useEffect(() => {
    // Apply security headers on component mount
    securityHeadersService.applySecurityHeaders();
    
    // Check compliance
    const compliance = securityHeadersService.checkSecurityCompliance();
    const isSecure = compliance.httpsEnabled && compliance.headersApplied;
    
    setSecurityStatus({
      ...compliance,
      isSecure
    });

    // Log security status
    if (isSecure) {
      console.log('✅ Security headers applied successfully');
    } else {
      console.warn('⚠️ Security compliance issues detected:', compliance.recommendations);
    }
  }, []);

  const reapplyHeaders = () => {
    securityHeadersService.applySecurityHeaders();
    const compliance = securityHeadersService.checkSecurityCompliance();
    setSecurityStatus({
      ...compliance,
      isSecure: compliance.httpsEnabled && compliance.headersApplied
    });
  };

  return {
    securityStatus,
    reapplyHeaders,
    getSecurityHeaders: () => securityHeadersService.getSecurityHeaders()
  };
}
