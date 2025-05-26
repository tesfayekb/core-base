
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { threatDetectionService, SecurityThreat } from '@/services/security/ThreatDetectionService';
import { realTimeAuditMonitor } from '@/services/audit/RealTimeAuditMonitor';

interface SecurityThreatsPanelProps {
  tenantId: string | null;
}

export function SecurityThreatsPanel({ tenantId }: SecurityThreatsPanelProps) {
  const [activeThreats, setActiveThreats] = useState<SecurityThreat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const loadThreats = () => {
      const threats = threatDetectionService.getActiveThreats(tenantId);
      setActiveThreats(threats);
      setLoading(false);
    };

    loadThreats();

    // Subscribe to new threats
    const unsubscribe = realTimeAuditMonitor.subscribeToSecurityThreats((threat: SecurityThreat) => {
      if (threat.tenantId === tenantId) {
        setActiveThreats(prev => [...prev, threat]);
      }
    });

    return unsubscribe;
  }, [tenantId]);

  const handleAcknowledgeThreat = (threatId: string) => {
    threatDetectionService.acknowledgeeThreat(threatId);
    setActiveThreats(prev => prev.filter(threat => threat.id !== threatId));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Shield className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Threats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading threats...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Security Threats</span>
          {activeThreats.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {activeThreats.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeThreats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p>No active security threats detected</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeThreats.map((threat) => (
              <div key={threat.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getSeverityIcon(threat.severity)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{threat.type.replace(/_/g, ' ')}</h4>
                        <Badge variant={getSeverityColor(threat.severity) as any}>
                          {threat.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {threat.description}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        <strong>Indicators:</strong> {threat.indicators.join(', ')}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <strong>Detected:</strong> {new Date(threat.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAcknowledgeThreat(threat.id)}
                  >
                    Acknowledge
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
