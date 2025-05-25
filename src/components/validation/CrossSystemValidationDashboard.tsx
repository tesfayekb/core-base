
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { crossSystemValidator, CrossSystemValidationSummary, CrossSystemValidationResult } from '../../services/validation/CrossSystemIntegration';

export function CrossSystemValidationDashboard() {
  const [validationResults, setValidationResults] = useState<CrossSystemValidationSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runValidation = async () => {
    setIsRunning(true);
    try {
      const results = await crossSystemValidator.runComprehensiveValidation();
      setValidationResults(results);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      passed: 'default',
      warning: 'secondary',
      failed: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cross-System Integration Validation</h2>
        <Button 
          onClick={runValidation} 
          disabled={isRunning}
          className="gap-2"
        >
          {isRunning && <RefreshCw className="w-4 h-4 animate-spin" />}
          {isRunning ? 'Running Validation...' : 'Run Validation'}
        </Button>
      </div>

      {validationResults && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Overall System Health
                <Badge 
                  variant={validationResults.overallStatus === 'healthy' ? 'default' : 'destructive'}
                  className={getOverallStatusColor(validationResults.overallStatus)}
                >
                  {validationResults.overallStatus}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{validationResults.totalChecks}</div>
                  <div className="text-sm text-gray-600">Total Checks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{validationResults.passed}</div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{validationResults.warnings}</div>
                  <div className="text-sm text-gray-600">Warnings</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{validationResults.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {validationResults.results.map((result, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      {result.integrationPoint}
                    </div>
                    {getStatusBadge(result.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{result.message}</p>
                  
                  {result.metrics && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">Metrics:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(result.metrics).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                            <span className="font-mono">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {result.recommendations && result.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Recommendations:</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {result.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-gray-700">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
