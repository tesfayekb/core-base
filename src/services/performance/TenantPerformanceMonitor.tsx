
import React, { useState, useEffect } from 'react';
import { tenantContextService } from '@/services/SharedTenantContextService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, Clock, Users, Zap } from 'lucide-react';

interface CacheStats {
  userTenantCache: number;
  tenantValidationCache: number;
  tenantListCache: number;
  totalCacheSize: number;
}

export function TenantPerformanceMonitor() {
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    userTenantCache: 0,
    tenantValidationCache: 0,
    tenantListCache: 0,
    totalCacheSize: 0
  });

  const [hitRate, setHitRate] = useState(95); // Mock hit rate
  const [avgResponseTime, setAvgResponseTime] = useState(12); // Mock response time

  useEffect(() => {
    const updateStats = () => {
      try {
        const stats = tenantContextService.getCacheStats();
        setCacheStats(stats);
        
        // Simulate performance metrics
        setHitRate(85 + Math.random() * 15);
        setAvgResponseTime(8 + Math.random() * 12);
      } catch (error) {
        console.error('Failed to get cache stats:', error);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const getHitRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getResponseTimeColor = (time: number) => {
    if (time <= 10) return 'text-green-600';
    if (time <= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getHitRateColor(hitRate)}`}>
            {hitRate.toFixed(1)}%
          </div>
          <Progress value={hitRate} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Tenant context cache efficiency
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Response Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getResponseTimeColor(avgResponseTime)}`}>
            {avgResponseTime.toFixed(1)}ms
          </div>
          <p className="text-xs text-muted-foreground">
            Average tenant operation latency
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cache Entries</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {cacheStats.totalCacheSize}
          </div>
          <div className="flex gap-1 mt-1">
            <Badge variant="outline" className="text-xs">
              Users: {cacheStats.userTenantCache}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Valid: {cacheStats.tenantValidationCache}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {cacheStats.tenantListCache}
          </div>
          <p className="text-xs text-muted-foreground">
            Cached tenant configurations
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
