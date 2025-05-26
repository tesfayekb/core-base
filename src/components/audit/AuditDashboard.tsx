
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { realTimeAuditMonitor, AuditEventFilter } from '@/services/audit/RealTimeAuditMonitor';
import { useAuth } from '@/contexts/AuthContext';
import { AuditMetricsGrid } from './AuditMetricsGrid';
import { AuditRecentActivity } from './AuditRecentActivity';
import { AuditComplianceReports } from './AuditComplianceReports';
import { AuditEventTypesBreakdown } from './AuditEventTypesBreakdown';

export function AuditDashboard() {
  const { tenantId } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [filter, setFilter] = useState<AuditEventFilter>({});

  const timeRanges = {
    '1h': { start: new Date(Date.now() - 60 * 60 * 1000), end: new Date() },
    '24h': { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() },
    '7d': { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
    '30d': { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() }
  };

  const { data: auditMetrics, isLoading } = useQuery({
    queryKey: ['audit-metrics', tenantId, selectedTimeRange],
    queryFn: () => realTimeAuditMonitor.getAuditMetrics(
      tenantId || '', 
      timeRanges[selectedTimeRange as keyof typeof timeRanges]
    ),
    enabled: !!tenantId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs', tenantId, filter],
    queryFn: () => realTimeAuditMonitor.getFilteredAuditLogs({
      tenantId,
      ...filter,
      timeRange: timeRanges[selectedTimeRange as keyof typeof timeRanges]
    }),
    enabled: !!tenantId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading audit dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Audit Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <AuditMetricsGrid metrics={auditMetrics} />
      <AuditRecentActivity metrics={auditMetrics} />
      <AuditComplianceReports tenantId={tenantId} />
      <AuditEventTypesBreakdown metrics={auditMetrics} />
    </div>
  );
}
