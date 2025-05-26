
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditMetrics } from '@/services/audit/RealTimeAuditMonitor';

interface AuditEventTypesBreakdownProps {
  metrics: AuditMetrics | undefined;
}

export function AuditEventTypesBreakdown({ metrics }: AuditEventTypesBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Types Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(metrics?.eventsByType || {}).map(([type, count]) => (
            <div key={type} className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm text-muted-foreground">{type}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
