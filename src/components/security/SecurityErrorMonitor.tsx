
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { auditQueryService, SecurityEventSummary, SecurityStatistics } from '@/services/audit/auditQueryService';
import { AlertTriangle, Shield, Eye, Clock, RefreshCw } from 'lucide-react';

export function SecurityErrorMonitor() {
  const [recentEvents, setRecentEvents] = useState<SecurityEventSummary[]>([]);
  const [errorStats, setErrorStats] = useState<SecurityStatistics>({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    authFailures: 0,
    permissionDenials: 0,
    suspiciousActivities: 0,
    isolationViolations: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadSecurityData = async () => {
    try {
      setIsLoading(true);
      const [events, stats] = await Promise.all([
        auditQueryService.getRecentSecurityEvents(10),
        auditQueryService.getSecurityStatistics('24h')
      ]);
      
      setRecentEvents(events);
      setErrorStats(stats);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadSecurityData, 30000);
    return () => clearInterval(interval);
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

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'auth':
        return <Shield className="h-4 w-4" />;
      case 'rbac':
        return <Eye className="h-4 w-4" />;
      case 'security':
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Security Error Monitor</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSecurityData}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="text-xs text-muted-foreground">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Error Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Security Events (Last 24 Hours)</CardTitle>
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
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">{errorStats.authFailures}</div>
              <div className="text-xs text-muted-foreground">Auth Failures</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">{errorStats.permissionDenials}</div>
              <div className="text-xs text-muted-foreground">Permission Denials</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-600">{errorStats.suspiciousActivities}</div>
              <div className="text-xs text-muted-foreground">Suspicious Activities</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-800">{errorStats.isolationViolations}</div>
              <div className="text-xs text-muted-foreground">Isolation Violations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading security events...
            </div>
          ) : recentEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent security events
            </div>
          ) : (
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getEventTypeIcon(event.eventType)}
                    <div>
                      <div className="font-medium">{event.action.replace('_', ' ').toUpperCase()}</div>
                      <div className="text-sm text-muted-foreground">
                        {event.details.message || `${event.eventType} event`}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ID: {event.id.slice(-8)} • Source: {event.source}
                        {event.tenantId && ` • Tenant: ${event.tenantId.slice(-8)}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(event.severity)}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(event.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert for High Severity Events */}
      {(errorStats.critical > 0 || errorStats.high > 0) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {errorStats.critical > 0 && `${errorStats.critical} critical security events detected. `}
            {errorStats.high > 0 && `${errorStats.high} high-severity security events detected. `}
            Immediate attention may be required.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
