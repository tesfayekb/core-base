
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuditMetrics } from '@/services/audit/RealTimeAuditMonitor';

interface AuditRecentActivityProps {
  metrics: AuditMetrics | undefined;
}

export function AuditRecentActivity({ metrics }: AuditRecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics?.recentActivity?.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Badge variant={activity.outcome === 'success' ? 'default' : 'destructive'}>
                  {activity.outcome}
                </Badge>
                <span className="font-medium">{activity.action}</span>
                <span className="text-muted-foreground">on {activity.resource}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {new Date(activity.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
