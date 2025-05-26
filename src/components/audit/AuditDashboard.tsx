
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { Shield, Activity, AlertTriangle, FileText, Download } from 'lucide-react';
import { realTimeAuditMonitor, AuditEventFilter } from '@/services/audit/RealTimeAuditMonitor';
import { useAuth } from '@/contexts/AuthContext';

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

  const handleGenerateReport = async (reportType: 'daily' | 'weekly' | 'monthly') => {
    if (!tenantId) return;
    
    const report = await realTimeAuditMonitor.generateComplianceReport(tenantId, reportType);
    
    // Create downloadable report
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${reportType}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditMetrics?.totalEvents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{auditMetrics?.securityEvents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failure Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditMetrics?.failureRate?.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Event Types</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(auditMetrics?.eventsByType || {}).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {auditMetrics?.recentActivity?.map((activity, index) => (
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

      {/* Compliance Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              onClick={() => handleGenerateReport('daily')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Daily Report</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleGenerateReport('weekly')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Weekly Report</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleGenerateReport('monthly')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Monthly Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Event Types Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Event Types Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(auditMetrics?.eventsByType || {}).map(([type, count]) => (
              <div key={type} className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground">{type}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
