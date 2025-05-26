
// Updated to use optimized component
import React from 'react';
import { OptimizedAnalyticsOverview } from './optimized/OptimizedAnalyticsOverview';
import { AnalyticsErrorBoundary } from './core/AnalyticsErrorBoundary';
import { AnalyticsTimeRange } from '@/services/analytics/UserAnalyticsService';

interface AnalyticsOverviewProps {
  timeRange?: AnalyticsTimeRange;
  className?: string;
}

export function AnalyticsOverview({ timeRange = '30d', className }: AnalyticsOverviewProps) {
  return (
    <AnalyticsErrorBoundary>
      <OptimizedAnalyticsOverview timeRange={timeRange} className={className} />
    </AnalyticsErrorBoundary>
  );
}
