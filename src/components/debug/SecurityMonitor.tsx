
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Clock, Lock } from 'lucide-react';
import { secureFileScanner } from '@/services/SecureFileScanner';

export const SecurityMonitor: React.FC = () => {
  const [securityReport, setSecurityReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityReport();
    const interval = setInterval(loadSecurityReport, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityReport = async () => {
    try {
      const report = secureFileScanner.getSecurityReport();
      setSecurityReport(report);
    } catch (error) {
      console.error('Failed to load security report:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearViolations = () => {
    secureFileScanner.clearViolationHistory();
    loadSecurityReport();
  };

  if (loading) {
    return <div className="p-4">Loading security report...</div>;
  }

  if (!securityReport) {
    return <div className="p-4">Failed to load security report</div>;
  }

  const { recentViolations, rateLimitStatus, configuration } = securityReport;
  const totalActiveUsers = Object.keys(rateLimitStatus).length;
  const violationsLastHour = recentViolations.filter(
    (v: any) => Date.now() - new Date(v.timestamp).getTime() < 60 * 60 * 1000
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Security Monitor
        </h2>
        <Button onClick={clearViolations} variant="outline" size="sm">
          Clear Violations
        </Button>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Violations</p>
                <p className="text-2xl font-bold">{recentViolations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Last Hour</p>
                <p className="text-2xl font-bold">{violationsLastHour}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">{totalActiveUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Rate Limits</p>
                <p className="text-2xl font-bold">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Violations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Violations</CardTitle>
        </CardHeader>
        <CardContent>
          {recentViolations.length === 0 ? (
            <p className="text-gray-500">No security violations detected</p>
          ) : (
            <div className="space-y-3">
              {recentViolations.slice(0, 10).map((violation: any, index: number) => (
                <Alert key={index} className="border-l-4 border-l-red-500">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="destructive" className="text-xs">
                            {violation.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {violation.path && (
                            <code className="text-sm bg-gray-100 px-1 rounded">
                              {violation.path}
                            </code>
                          )}
                        </div>
                        <p className="text-sm">{violation.details}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(violation.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate Limit Status */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limit Status</CardTitle>
        </CardHeader>
        <CardContent>
          {totalActiveUsers === 0 ? (
            <p className="text-gray-500">No active users</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(rateLimitStatus).map(([userId, stats]: [string, any]) => (
                <div key={userId} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <code className="text-sm">{userId}</code>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span>Last Hour: {stats.scansInLastHour}</span>
                    <span>Last Minute: {stats.scansInLastMinute}</span>
                    {stats.scansInLastMinute >= configuration.rateLimits.maxScansPerMinute && (
                      <Badge variant="destructive">Rate Limited</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Security Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Rate Limits</h4>
              <div className="space-y-1 text-sm">
                <p>Max scans per minute: {configuration.rateLimits.maxScansPerMinute}</p>
                <p>Max scans per hour: {configuration.rateLimits.maxScansPerHour}</p>
                <p>Cooldown period: {configuration.rateLimits.cooldownPeriod / 1000}s</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">File Permissions</h4>
              <div className="space-y-1 text-sm">
                <p>Max file size: {(configuration.permissions.maxFileSize / 1024).toFixed(0)}KB</p>
                <p>Max files per batch: {configuration.permissions.maxFilesPerBatch}</p>
                <p>Allowed extensions: {configuration.permissions.allowedExtensions.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
