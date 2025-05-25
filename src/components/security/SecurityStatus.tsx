
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Shield, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Info, Lock } from 'lucide-react';
import { useSecurityHeaders } from '@/hooks/useSecurityHeaders';
import { securityHeadersService } from '@/services/security/SecurityHeadersService';

export function SecurityStatus() {
  const { securityStatus } = useSecurityHeaders();
  const [showPermissionsDetails, setShowPermissionsDetails] = useState(false);
  const [showHSTSDetails, setShowHSTSDetails] = useState(false);

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  const permissionsDetails = securityHeadersService.getPermissionsPolicyDetails();
  const hstsDetails = securityHeadersService.getHSTSDetails();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Status
        </CardTitle>
        <CardDescription>
          Development security compliance check with enhanced HSTS verification
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

        <div className="flex items-center justify-between">
          <span>HSTS Active</span>
          <Badge variant={securityStatus.hstsActive ? "default" : "destructive"}>
            {securityStatus.hstsActive ? (
              <Lock className="h-3 w-3 mr-1" />
            ) : (
              <AlertTriangle className="h-3 w-3 mr-1" />
            )}
            {securityStatus.hstsActive ? 'Configured' : 'Missing'}
          </Badge>
        </div>

        <Collapsible open={showHSTSDetails} onOpenChange={setShowHSTSDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                HSTS Configuration Details
              </span>
              {showHSTSDetails ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-3">
            <div className="text-sm text-muted-foreground mb-2">
              HTTP Strict Transport Security configuration:
            </div>
            {securityStatus.hstsConfiguration && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium">Max Age:</div>
                  <div className="text-muted-foreground">
                    {securityStatus.hstsConfiguration.maxAge} seconds 
                    {securityStatus.hstsConfiguration.maxAge >= 31536000 ? ' ✅' : ' ⚠️ (should be ≥31536000)'}
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium">Include Subdomains:</div>
                  <div className="text-muted-foreground">
                    {securityStatus.hstsConfiguration.includeSubDomains ? 'Yes ✅' : 'No ⚠️'}
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium">Preload:</div>
                  <div className="text-muted-foreground">
                    {securityStatus.hstsConfiguration.preload ? 'Yes ✅' : 'No (optional)'}
                  </div>
                </div>
              </div>
            )}
            {Object.entries(hstsDetails).map(([feature, description]) => (
              <div key={feature} className="flex items-start gap-2 p-2 bg-blue-50 rounded text-sm">
                <div className="font-medium min-w-0 flex-shrink-0">{feature}:</div>
                <div className="text-muted-foreground">{description}</div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={showPermissionsDetails} onOpenChange={setShowPermissionsDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Granular Permissions Policy
              </span>
              {showPermissionsDetails ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-3">
            <div className="text-sm text-muted-foreground mb-2">
              Browser feature permissions configured for enterprise security:
            </div>
            {Object.entries(permissionsDetails).map(([feature, description]) => (
              <div key={feature} className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm">
                <div className="font-medium min-w-0 flex-shrink-0">{feature}:</div>
                <div className="text-muted-foreground">{description}</div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

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
