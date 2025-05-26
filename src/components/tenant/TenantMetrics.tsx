
import React, { useState, useEffect } from 'react';
import { MetricsGrid } from './metrics/MetricsGrid';
import { ResourceUsageCard } from './metrics/ResourceUsageCard';
import { RecentActivityCard } from './metrics/RecentActivityCard';
import { QuotaAlert } from './metrics/QuotaAlert';
import { useAuth } from '@/contexts/AuthContext';

interface TenantMetrics {
  activeUsers: { current: number; change: number };
  resourceUsage: { storage: number; api: number; bandwidth: number };
  performance: { avgResponseTime: number; uptime: number };
  quotaStatus: { used: number; total: number; percentage: number };
  recentActivity: Array<{ action: string; timestamp: string; user: string }>;
}

export function TenantMetrics() {
  const { tenantId } = useAuth();
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 60000);
    return () => clearInterval(interval);
  }, [tenantId]);

  const loadMetrics = async () => {
    if (!tenantId) return;

    try {
      const mockMetrics: TenantMetrics = {
        activeUsers: { current: 142, change: 8 },
        resourceUsage: { storage: 65, api: 78, bandwidth: 45 },
        performance: { avgResponseTime: 245, uptime: 99.8 },
        quotaStatus: { used: 1250, total: 2000, percentage: 62.5 },
        recentActivity: [
          { action: 'User login', timestamp: '2024-01-15T10:30:00Z', user: 'john.doe@acme.com' },
          { action: 'File uploaded', timestamp: '2024-01-15T10:25:00Z', user: 'jane.smith@acme.com' },
          { action: 'Report generated', timestamp: '2024-01-15T10:20:00Z', user: 'admin@acme.com' },
          { action: 'Settings updated', timestamp: '2024-01-15T10:15:00Z', user: 'admin@acme.com' }
        ]
      };

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to load tenant metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading metrics...</div>;
  }

  if (!metrics) {
    return <div className="p-6">Failed to load metrics</div>;
  }

  return (
    <div className="space-y-6">
      <MetricsGrid metrics={metrics} />
      <ResourceUsageCard resourceUsage={metrics.resourceUsage} />
      <RecentActivityCard recentActivity={metrics.recentActivity} />
      <QuotaAlert quotaPercentage={metrics.quotaStatus.percentage} />
    </div>
  );
}
