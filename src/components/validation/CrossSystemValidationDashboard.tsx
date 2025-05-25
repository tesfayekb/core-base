
/**
 * Cross-System Validation Dashboard Component
 * 
 * Provides a comprehensive UI for monitoring and validating system integration health.
 * Displays real-time validation results, metrics, and recommendations for system optimization.
 * 
 * Key features:
 * - Real-time validation execution
 * - Visual status indicators
 * - Detailed metrics display
 * - Actionable recommendations
 * - Responsive design for mobile and desktop
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { crossSystemValidator, CrossSystemValidationSummary, CrossSystemValidationResult } from '../../services/validation/CrossSystemIntegration';

/**
 * Main validation dashboard component
 * 
 * Manages validation execution state and displays comprehensive validation results
 * with real-time updates and user-friendly status indicators.
 */
export function CrossSystemValidationDashboard() {
  // State management for validation results and execution status
  const [validationResults, setValidationResults] = useState<CrossSystemValidationSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  /**
   * Executes comprehensive system validation
   * 
   * Triggers all validation checks and updates the UI with results.
   * Includes error handling and loading state management.
   */
  const runValidation = async () => {
    setIsRunning(true);
    try {
      // Execute comprehensive validation across all integration points
      const results = await crossSystemValidator.runComprehensiveValidation();
      setValidationResults(results);
    } catch (error) {
      // Log error for debugging while maintaining user experience
      console.error('Validation failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * Returns appropriate status icon based on validation result
   * 
   * @param status - Validation status ('passed', 'warning', 'failed')
   * @returns JSX element with appropriate icon and color
   */
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

  /**
   * Returns appropriate badge variant based on validation status
   * 
   * @param status - Validation status
   * @returns Badge component with appropriate styling
   */
  const getStatusBadge = (status: string) => {
    const variants = {
      passed: 'default',
      warning: 'secondary',
      failed: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  /**
   * Returns appropriate text color for overall system status
   * 
   * @param status - Overall system health status
   * @returns CSS class string for text color
   */
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
      {/* Dashboard header with validation trigger */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cross-System Integration Validation</h2>
        <Button 
          onClick={runValidation} 
          disabled={isRunning}
          className="gap-2"
        >
          {/* Show loading spinner during validation execution */}
          {isRunning && <RefreshCw className="w-4 h-4 animate-spin" />}
          {isRunning ? 'Running Validation...' : 'Run Validation'}
        </Button>
      </div>

      {/* Validation results display */}
      {validationResults && (
        <>
          {/* Overall system health summary */}
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
              {/* Validation statistics grid */}
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

          {/* Detailed validation results for each integration point */}
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
                  {/* Validation result message */}
                  <p className="text-gray-700 mb-4">{result.message}</p>
                  
                  {/* Performance metrics display */}
                  {result.metrics && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">Metrics:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(result.metrics).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            {/* Convert camelCase to readable format */}
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                            <span className="font-mono">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Actionable recommendations */}
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
