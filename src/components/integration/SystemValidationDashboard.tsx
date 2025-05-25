
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { crossSystemValidator, CrossSystemValidationReport } from '@/services/integration/CrossSystemValidator';
import { systemHealthMonitor, SystemHealthStatus } from '@/services/integration/SystemHealthMonitor';
import { Shield, Activity, Database, Globe, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

export function SystemValidationDashboard() {
  const [validationReport, setValidationReport] = useState<CrossSystemValidationReport | null>(null);
  const [healthStatus, setHealthStatus] = useState<SystemHealthStatus | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const runValidation = async () => {
    setIsValidating(true);
    try {
      const report = await crossSystemValidator.validateAllSystems();
      const health = await systemHealthMonitor.refreshHealth();
      
      setValidationReport(report);
      setHealthStatus(health);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    runValidation();
  }, []);

  const getSystemIcon = (systemName: string) => {
    switch (systemName) {
      case 'Performance Monitoring': return <Activity className="w-5 h-5" />;
      case 'Security Infrastructure': return <Shield className="w-5 h-5" />;
      case 'Data Collection': return <Database className="w-5 h-5" />;
      case 'System Integration': return <Globe className="w-5 h-5" />;
      default: return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!validationReport || !healthStatus) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p>Running system validation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Validation Dashboard</h1>
        <Button 
          onClick={runValidation} 
          disabled={isValidating}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
          {isValidating ? 'Validating...' : 'Run Validation'}
        </Button>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getHealthStatusColor(healthStatus.status)}`}>
                {healthStatus.status.toUpperCase()}
              </div>
              <p className="text-sm text-gray-600 mt-1">Overall Status</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{healthStatus.score}%</div>
              <p className="text-sm text-gray-600">Health Score</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{validationReport.overall.systemsPassed}</div>
              <p className="text-sm text-gray-600">Systems Passed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{validationReport.overall.criticalIssues}</div>
              <p className="text-sm text-gray-600">Critical Issues</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(healthStatus.systemMetrics).map(([system, score]) => (
          <Card key={system}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium capitalize">{system}</span>
                <span className="text-sm text-gray-600">{score}%</span>
              </div>
              <Progress value={score} className="h-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Validation Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Validation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {validationReport.results.map((result, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getSystemIcon(result.system)}
                  {getStatusIcon(result.passed)}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{result.system}</h4>
                  {result.issues.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {result.issues.map((issue, issueIndex) => (
                        <div key={issueIndex} className="text-sm text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {issue}
                        </div>
                      ))}
                    </div>
                  )}
                  {result.passed && (
                    <p className="text-sm text-green-600 mt-1">All checks passed</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(validationReport.integrationMatrix).map(([system, integrations]) => (
                <div key={system} className="border rounded-lg p-3">
                  <h4 className="font-medium mb-2">{system}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(integrations).map(([target, status]) => (
                      <div key={target} className="flex items-center gap-2">
                        <Badge variant={status ? "default" : "destructive"} className="text-xs">
                          {target}
                        </Badge>
                        {status ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {validationReport.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>System Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validationReport.recommendations.map((recommendation, index) => (
                <Alert key={index}>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{recommendation}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p><strong>Validation Time:</strong> {new Date(validationReport.overall.timestamp).toLocaleString()}</p>
            <p><strong>Systems Validated:</strong> {validationReport.overall.systemsValidated}</p>
            <p><strong>Success Rate:</strong> {Math.round((validationReport.overall.systemsPassed / validationReport.overall.systemsValidated) * 100)}%</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
