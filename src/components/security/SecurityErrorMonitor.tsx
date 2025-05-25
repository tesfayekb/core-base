
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SecurityErrorType } from '@/services/security/secureErrorService';
import { AlertTriangle, Shield, Eye, Clock } from 'lucide-react';

interface SecurityErrorEvent {
  id: string;
  timestamp: string;
  errorType: SecurityErrorType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  userMessage: string;
  requestId: string;
  source: string;
}

export function SecurityErrorMonitor() {
  const [recentErrors, setRecentErrors] = useState<SecurityErrorEvent[]>([]);
  const [errorStats, setErrorStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  });

  // Mock data for demonstration - in real implementation, this would fetch from audit service
  useEffect(() => {
    const mockErrors: SecurityErrorEvent[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        errorType: SecurityErrorType.AUTHENTICATION_FAILED,
        severity: 'medium',
        userId: 'user123',
        userMessage: 'Authentication failed. Please check your credentials.',
        requestId: 'req_1234567890',
        source: 'authentication'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        errorType: SecurityErrorType.PERMISSION_DENIED,
        severity: 'high',
        userId: 'user456',
        userMessage: 'You do not have permission to perform this action.',
        requestId: 'req_0987654321',
        source: 'authorization'
      }
    ];

    setRecentErrors(mockErrors);
    
    const stats = mockErrors.reduce((acc, error) => {
      acc.total++;
      acc[error.severity]++;
      return acc;
    }, { total: 0, critical: 0, high: 0, medium: 0, low: 0 });
    
    setErrorStats(stats);
  }, []);

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    } as const;

    const colors = {
      critical: 'text-red-600',
      high: 'text-orange-600',
      medium: 'text-yellow-600',
      low: 'text-green-600'
    } as const;

    return (
      <Badge variant={variants[severity as keyof typeof variants]} className={colors[severity as keyof typeof colors]}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getErrorTypeIcon = (errorType: SecurityErrorType) => {
    switch (errorType) {
      case SecurityErrorType.AUTHENTICATION_FAILED:
        return <Shield className="h-4 w-4" />;
      case SecurityErrorType.PERMISSION_DENIED:
        return <Eye className="h-4 w-4" />;
      case SecurityErrorType.SUSPICIOUS_ACTIVITY:
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Security Error Monitor</h2>
      </div>

      {/* Error Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Error Statistics (Last 24 Hours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{errorStats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{errorStats.critical}</div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{errorStats.high}</div>
              <div className="text-sm text-muted-foreground">High</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{errorStats.medium}</div>
              <div className="text-sm text-muted-foreground">Medium</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{errorStats.low}</div>
              <div className="text-sm text-muted-foreground">Low</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Security Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Errors</CardTitle>
        </CardHeader>
        <CardContent>
          {recentErrors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent security errors
            </div>
          ) : (
            <div className="space-y-4">
              {recentErrors.map((error) => (
                <div key={error.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getErrorTypeIcon(error.errorType)}
                    <div>
                      <div className="font-medium">{error.errorType.replace('_', ' ').toUpperCase()}</div>
                      <div className="text-sm text-muted-foreground">
                        {error.userMessage}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Request ID: {error.requestId} • Source: {error.source}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(error.severity)}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(error.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert for High Severity Errors */}
      {errorStats.critical > 0 || errorStats.high > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {errorStats.critical > 0 && `${errorStats.critical} critical security errors detected. `}
            {errorStats.high > 0 && `${errorStats.high} high-severity security errors detected. `}
            Immediate attention may be required.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
