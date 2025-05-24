
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSecurityHeaders } from '@/hooks/useSecurityHeaders';

export function SecurityStatus() {
  const { securityStatus } = useSecurityHeaders();

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Status
        </CardTitle>
        <CardDescription>
          Development security compliance check
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>HTTPS Enabled</span>
          <Badge variant={securityStatus.httpsEnabled ? "default" : "destructive"}>
            {securityStatus.httpsEnabled ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertTriangle className="h-3 w-3 mr-1" />
            )}
            {securityStatus.httpsEnabled ? 'Yes' : 'No'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Headers Applied</span>
          <Badge variant={securityStatus.headersApplied ? "default" : "destructive"}>
            {securityStatus.headersApplied ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertTriangle className="h-3 w-3 mr-1" />
            )}
            {securityStatus.headersApplied ? 'Yes' : 'No'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span>CSP Active</span>
          <Badge variant={securityStatus.cspActive ? "default" : "secondary"}>
            {securityStatus.cspActive ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertTriangle className="h-3 w-3 mr-1" />
            )}
            {securityStatus.cspActive ? 'Yes' : 'Partial'}
          </Badge>
        </div>

        {securityStatus.recommendations.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Recommendations:</strong>
              <ul className="mt-2 space-y-1">
                {securityStatus.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm">• {rec}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-center">
          <Badge variant={securityStatus.isSecure ? "default" : "destructive"}>
            Overall Status: {securityStatus.isSecure ? 'Secure' : 'Needs Attention'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
