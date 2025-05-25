
// Tenant Security Monitor Component - Multi-Tenant Security Dashboard
// Phase 1.6: Multi-Tenant Foundation Security Monitoring

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTenantSecurity } from '@/hooks/useTenantSecurity';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, AlertTriangle, Users, Lock, Eye } from 'lucide-react';

interface TenantSecurityStats {
  totalTenants: number;
  accessViolations: number;
  suspiciousSwitching: number;
  isolationBreaches: number;
  activeUsers: number;
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  type: 'access_violation' | 'suspicious_switching' | 'isolation_breach';
  userId: string;
  tenantId: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function TenantSecurityMonitor() {
  const { user, tenantId } = useAuth();
  const { isValidating } = useTenantSecurity();
  const [stats, setStats] = useState<TenantSecurityStats>({
    totalTenants: 0,
    accessViolations: 0,
    suspiciousSwitching: 0,
    isolationBreaches: 0,
    activeUsers: 0
  });
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);

  // Mock data for demonstration - in real implementation, fetch from audit service
  useEffect(() => {
    const mockStats: TenantSecurityStats = {
      totalTenants: 12,
      accessViolations: 3,
      suspiciousSwitching: 1,
      isolationBreaches: 0,
      activeUsers: 45
    };

    const mockEvents: SecurityEvent[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        type: 'access_violation',
        userId: 'user123',
        tenantId: 'tenant-abc',
        details: 'Attempted access to unauthorized tenant data',
        severity: 'high'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        type: 'suspicious_switching',
        userId: 'user456',
        tenantId: 'tenant-def',
        details: 'Rapid tenant switching detected (6 switches in 30 seconds)',
        severity: 'medium'
      }
    ];

    setStats(mockStats);
    setRecentEvents(mockEvents);
  }, []);

  const getEventIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'access_violation':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'suspicious_switching':
        return <Users className="h-4 w-4 text-orange-600" />;
      case 'isolation_breach':
        return <Lock className="h-4 w-4 text-red-800" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getSeverityBadge = (severity: SecurityEvent['severity']) => {
    const variants = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    } as const;

    return (
      <Badge variant={variants[severity]}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const formatEventType = (type: SecurityEvent['type']) => {
    return type.replace('_', ' ').toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Tenant Security Monitor</h2>
        {isValidating && (
          <Badge variant="outline" className="ml-auto">
            Validating...
          </Badge>
        )}
      </div>

      {/* Security Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalTenants}</div>
              <div className="text-sm text-muted-foreground">Total Tenants</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.accessViolations}</div>
              <div className="text-sm text-muted-foreground">Access Violations</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.suspiciousSwitching}</div>
              <div className="text-sm text-muted-foreground">Suspicious Switching</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-800">{stats.isolationBreaches}</div>
              <div className="text-sm text-muted-foreground">Isolation Breaches</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
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
              <span className="text-muted-foreground">{user?.id || 'Not authenticated'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Current Tenant:</span>
              <span className="text-muted-foreground">{tenantId || 'No tenant selected'}</span>
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
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent security events
            </div>
          ) : (
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getEventIcon(event.type)}
                    <div>
                      <div className="font-medium">{formatEventType(event.type)}</div>
                      <div className="text-sm text-muted-foreground">{event.details}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        User: {event.userId} • Tenant: {event.tenantId}
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
      {(stats.accessViolations > 0 || stats.isolationBreaches > 0) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {stats.isolationBreaches > 0 && 
              `${stats.isolationBreaches} data isolation breaches detected. `
            }
            {stats.accessViolations > 0 && 
              `${stats.accessViolations} unauthorized access attempts detected. `
            }
            Immediate investigation recommended.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
