
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  Users, 
  Activity, 
  Shield, 
  TrendingUp, 
  Clock,
  AlertTriangle,
  Calendar,
  Eye
} from 'lucide-react';
import { userAnalyticsService } from '@/services/analytics/UserAnalyticsService';

interface UserAnalyticsDashboardProps {
  tenantId: string;
  userId?: string;
}

export function UserAnalyticsDashboard({ tenantId, userId }: UserAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState('30');
  const [selectedMetric, setSelectedMetric] = useState('overview');

  // Fetch tenant analytics
  const { data: tenantAnalytics, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant-analytics', tenantId],
    queryFn: () => userAnalyticsService.getTenantAnalytics(tenantId),
    enabled: !!tenantId
  });

  // Fetch user metrics if userId is provided
  const { data: userMetrics, isLoading: userLoading } = useQuery({
    queryKey: ['user-metrics', userId, tenantId],
    queryFn: () => userId ? userAnalyticsService.getUserActivityMetrics(userId, tenantId) : null,
    enabled: !!userId && !!tenantId
  });

  // Fetch usage patterns
  const { data: usagePatterns, isLoading: patternsLoading } = useQuery({
    queryKey: ['usage-patterns', tenantId, timeRange],
    queryFn: () => userAnalyticsService.getUsagePatterns(tenantId, parseInt(timeRange)),
    enabled: !!tenantId
  });

  // Fetch security correlations
  const { data: securityCorrelations, isLoading: securityLoading } = useQuery({
    queryKey: ['security-correlations', tenantId],
    queryFn: () => userAnalyticsService.getSecurityEventCorrelation(tenantId),
    enabled: !!tenantId
  });

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const getRiskBadgeVariant = (score: number) => {
    if (score >= 70) return 'destructive';
    if (score >= 40) return 'outline';
    return 'secondary';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return 'High Risk';
    if (score >= 40) return 'Medium Risk';
    return 'Low Risk';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={selectedMetric} onValueChange={setSelectedMetric}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="patterns">Usage Patterns</TabsTrigger>
          <TabsTrigger value="security">Security Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Tenant Overview */}
          {tenantAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                      <p className="text-2xl font-bold">{tenantAnalytics.activeUsers}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                      <p className="text-2xl font-bold">{tenantAnalytics.totalSessions}</p>
                    </div>
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Engagement</p>
                      <p className="text-2xl font-bold">{tenantAnalytics.averageUserEngagement.toFixed(1)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Security Alerts</p>
                      <p className="text-2xl font-bold">{tenantAnalytics.securityAlerts}</p>
                    </div>
                    <Shield className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Features */}
          {tenantAnalytics && (
            <Card>
              <CardHeader>
                <CardTitle>Top Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tenantAnalytics.topFeatures.map((feature, index) => (
                    <div key={feature} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">#{index + 1}</span>
                        <span className="text-sm">{feature}</span>
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          {/* User-specific metrics */}
          {userId && userMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>User Activity Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="h-4 w-4" />
                      <span className="text-sm font-medium">Sessions</span>
                    </div>
                    <p className="text-2xl font-bold">{userMetrics.totalSessions}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">Avg Session</span>
                    </div>
                    <p className="text-2xl font-bold">{formatDuration(userMetrics.averageSessionDuration)}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">Actions</span>
                    </div>
                    <p className="text-2xl font-bold">{userMetrics.actionsPerformed}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">Login Frequency</span>
                    </div>
                    <p className="text-2xl font-bold">{userMetrics.loginFrequency}/week</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">Security Events</span>
                    </div>
                    <p className="text-2xl font-bold">{userMetrics.securityEvents}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">Last Activity</span>
                    </div>
                    <p className="text-sm">{userMetrics.lastActivity.toLocaleDateString()}</p>
                  </div>
                </div>

                {userMetrics.mostUsedFeatures.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">Most Used Features</h4>
                    <div className="flex flex-wrap gap-2">
                      {userMetrics.mostUsedFeatures.map((feature, index) => (
                        <Badge key={feature} variant="outline">
                          #{index + 1} {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          {/* Usage Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              {patternsLoading ? (
                <p className="text-center text-muted-foreground">Loading usage patterns...</p>
              ) : usagePatterns && usagePatterns.length > 0 ? (
                <div className="space-y-4">
                  {usagePatterns.slice(0, 10).map((pattern) => (
                    <div key={pattern.feature} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{pattern.feature}</h4>
                        <Badge variant="outline">{pattern.usageCount} uses</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span>Last used: {pattern.lastUsed.toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span>Peak hours: {pattern.peakUsageHours.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">No usage patterns found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Security Event Correlation */}
          <Card>
            <CardHeader>
              <CardTitle>Security Event Correlation</CardTitle>
            </CardHeader>
            <CardContent>
              {securityLoading ? (
                <p className="text-center text-muted-foreground">Loading security analysis...</p>
              ) : securityCorrelations && securityCorrelations.length > 0 ? (
                <div className="space-y-4">
                  {securityCorrelations.slice(0, 10).map((correlation) => (
                    <div key={correlation.userId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">User: {correlation.userId.slice(0, 8)}...</span>
                        </div>
                        <Badge variant={getRiskBadgeVariant(correlation.riskScore)}>
                          {getRiskLabel(correlation.riskScore)} ({correlation.riskScore})
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Event Type: </span>
                          <span>{correlation.eventType}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Frequency: </span>
                          <span>{correlation.frequency} events</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Peak Hour: </span>
                          <span>{correlation.timePattern.hourOfDay}:00</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Peak Day: </span>
                          <span>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][correlation.timePattern.dayOfWeek]}</span>
                        </div>
                      </div>
                      {correlation.relatedEvents.length > 0 && (
                        <div className="mt-2">
                          <span className="text-sm text-muted-foreground">Related Events: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {correlation.relatedEvents.slice(0, 5).map((event) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">No security correlations found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
