
// Performance-optimized analytics data hook
import { useState, useEffect, useCallback, useRef } from 'react';
import { userAnalyticsService, AnalyticsTimeRange, TenantAnalytics } from '@/services/analytics/UserAnalyticsService';
import { useAuth } from '@/contexts/AuthContext';

interface UseAnalyticsDataResult {
  analytics: TenantAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useAnalyticsData(timeRange: AnalyticsTimeRange = '30d'): UseAnalyticsDataResult {
  const { tenantId } = useAuth();
  const [analytics, setAnalytics] = useState<TenantAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Use ref to track if component is mounted for cleanup
  const isMounted = useRef(true);
  
  // Memoized fetch function
  const fetchAnalytics = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);
      
      const data = await userAnalyticsService.getTenantAnalytics(tenantId, timeRange);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setAnalytics(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
        console.error('Analytics fetch error:', err);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [tenantId, timeRange]);

  // Effect with proper cleanup
  useEffect(() => {
    isMounted.current = true;
    fetchAnalytics();

    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [fetchAnalytics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
    lastUpdated
  };
}
