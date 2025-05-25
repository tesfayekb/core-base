
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTenantSecurity } from '@/hooks/useTenantSecurity';
import { useAuth } from '@/contexts/AuthContext';
import { auditQueryService, SecurityEventSummary, TenantSecurityMetrics } from '@/services/audit/auditQueryService';
import { Shield, AlertTriangle, Users, Lock, Eye, RefreshCw } from 'lucide-react';

export function TenantSecurityMonitor() {
  const { user, tenantId } = useAuth();
  const { isValidating } = useTenantSecurity();
  const [metrics, setMetrics] = useState<TenantSecurityMetrics>({
    totalTenants: 0,
    accessViolations: 0,
    suspiciousSwitching: 0,
    isolationBreaches: 0,
    activeUsers: 0
  });
  const [recentEvents, setRecentEvents] = useState<SecurityEventSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadTenantSecurityData = async () => {
    try {
      setIsLoading(true);
      const [tenantMetrics, events] = await Promise.all([
        auditQueryService.getTenantSecurityMetrics(),
        auditQueryService.getRecentSecurityEvents(5)
      ]);
      
      // Filter events for tenant-related security issues
      const tenantEvents = events.filter(event => 
        event.action.includes('tenant') || 
        event.details.operation?.includes('tenant') ||
        event.eventType === 'security'
      );
      
      setMetrics(tenantMetrics);
      setRecentEvents(tenantEvents);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load tenant security data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenantSecurityData();
    
    // Refresh every 45 seconds
    const interval = setInterval(loadTenantSecurityData, 45000);
    return () => clearInterval(interval);
  }, []);

  const getEventIcon = (type: string, action: string) => {
    if (action.includes('access') || action.includes('denied')) {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    if (action.includes('switch') || action.includes('tenant')) {
      return <Users className="h-4 w-4 text-orange-600" />;
    }
    if (action.includes('isolation') || action.includes('breach')) {
      return <Lock className="h-4 w-4 text-red-800" />;
    }
    return <Eye className="h-4 w-4" />;
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    } as const;

    return (
      <Badge variant={variants[severity as keyof typeof variants]}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const formatEventType = (action: string) => {
    return action.replace('_', ' ').toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Tenant Security Monitor</h2>
          {isValidating && (
            <Badge variant="outline" className="ml-2">
              Validating...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTenantSecurityData}
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

      {/* Security Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{metrics.totalTenants}</div>
              <div className="text-sm text-muted-foreground">Total Tenants</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.accessViolations}</div>
              <div className="text-sm text-muted-foreground">Access Violations</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{metrics.suspiciousSwitching}</div>
              <div className="text-sm text-muted-foreground">Suspicious Switching</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-800">{metrics.isolationBreaches}</div>
              <div className="text-sm text-muted-foreground">Isolation Breaches</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.activeUsers}</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Tenant Context */}
      <Card>
        <CardHeader>
          <CardTitle>Current Tenant Context</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">User ID:</span>
              <span className="text-muted-foreground">{user?.id?.slice(-8) || 'Not authenticated'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Current Tenant:</span>
              <span className="text-muted-foreground">{tenantId?.slice(-8) || 'No tenant selected'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Security Status:</span>
              <Badge variant={tenantId ? "default" : "destructive"}>
                {tenantId ? "Secure Context" : "Missing Context"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tenant Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading security events...
            </div>
          ) : recentEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent tenant security events
            </div>
          ) : (
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getEventIcon(event.eventType, event.action)}
                    <div>
                      <div className="font-medium">{formatEventType(event.action)}</div>
                      <div className="text-sm text-muted-foreground">
                        {event.details.message || 'Tenant security event'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        User: {event.userId?.slice(-8) || 'Unknown'} • Tenant: {event.tenantId?.slice(-8) || 'Unknown'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(event.severity)}
                    <div className="text-sm text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Alerts */}
      {(metrics.accessViolations > 0 || metrics.isolationBreaches > 0) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {metrics.isolationBreaches > 0 && 
              `${metrics.isolationBreaches} data isolation breaches detected. `
            }
            {metrics.accessViolations > 0 && 
              `${metrics.accessViolations} unauthorized access attempts detected. `
            }
            Immediate investigation recommended.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
