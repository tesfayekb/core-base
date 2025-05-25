
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DetailedPerformanceMetrics, 
  detailedMetricsCollector 
} from '@/services/performance/DetailedMetricsCollector';
import { 
  PerformanceAnalysis, 
  performanceAnalysisService 
} from '@/services/performance/PerformanceAnalysisService';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Shield,
  Monitor
} from 'lucide-react';

export function DetailedPerformanceDashboard() {
  const [metrics, setMetrics] = useState<DetailedPerformanceMetrics | null>(null);
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadPerformanceData = async () => {
    try {
      setIsLoading(true);
      const [currentMetrics, currentAnalysis] = await Promise.all([
        detailedMetricsCollector.collectMetrics(),
        Promise.resolve(performanceAnalysisService.analyzePerformance())
      ]);
      
      setMetrics(currentMetrics);
      setAnalysis(currentAnalysis);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPerformanceData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadPerformanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'degrading': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'optimization': return <TrendingUp className="h-4 w-4 text-blue-600" />;
      default: return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  if (isLoading && !metrics) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Loading detailed performance metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Detailed Performance Dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPerformanceData}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="text-xs text-muted-foreground">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Overall Score */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                {analysis.overallScore}/100
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Overall Performance Score
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Performance</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">CPU Usage:</span>
                  <span className="text-sm font-medium">{metrics.system.cpuUsage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Memory Usage:</span>
                  <span className="text-sm font-medium">{metrics.system.memoryUsage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Error Rate:</span>
                  <span className="text-sm font-medium">{metrics.system.errorRate.toFixed(2)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database Performance</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Avg Query Time:</span>
                  <span className="text-sm font-medium">{metrics.database.averageQueryTime.toFixed(1)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Cache Hit Rate:</span>
                  <span className="text-sm font-medium">{metrics.database.cacheHitRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">QPS:</span>
                  <span className="text-sm font-medium">{metrics.database.queriesPerSecond.toFixed(1)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Performance</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Auth Latency:</span>
                  <span className="text-sm font-medium">{metrics.security.authenticationLatency.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Permission Check:</span>
                  <span className="text-sm font-medium">{metrics.security.permissionCheckLatency.toFixed(1)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Validation Rate:</span>
                  <span className="text-sm font-medium">{metrics.security.securityValidationRate.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Trends */}
      {analysis && Object.keys(analysis.trends).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(analysis.trends).map(([metric, trend]) => (
                <div key={metric} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium text-sm">{metric.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className="text-xs text-muted-foreground capitalize">{trend}</div>
                  </div>
                  {getTrendIcon(trend)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Insights */}
      {analysis && analysis.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{insight.message}</span>
                      <Badge variant={insight.type === 'critical' ? 'destructive' : 'secondary'}>
                        {insight.impact} impact
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Current: {insight.currentValue} | Target: {insight.targetValue}
                    </div>
                    <div className="text-sm bg-gray-50 p-2 rounded">
                      💡 {insight.recommendation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analysis && analysis.recommendations.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Performance Recommendations:</div>
            <ul className="list-disc list-inside space-y-1">
              {analysis.recommendations.map((rec, index) => (
                <li key={index} className="text-sm">{rec}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
