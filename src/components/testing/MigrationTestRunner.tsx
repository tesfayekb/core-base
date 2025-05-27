
import React, { useState } from 'react';
import { useMigrations } from '../../hooks/useMigrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

export function MigrationTestRunner() {
  const { isRunning, error, isComplete, runMigrations } = useMigrations();
  const [testResults, setTestResults] = useState<TestResult[]>([
    { name: 'Infrastructure Setup', status: 'pending' },
    { name: 'Core Tables Creation', status: 'pending' },
    { name: 'RLS Policies', status: 'pending' },
    { name: 'Database Functions', status: 'pending' }
  ]);

  const runTests = async () => {
    console.log('🧪 Starting migration tests...');
    
    // Update test status to running
    setTestResults(prev => prev.map(test => ({ ...test, status: 'running' })));
    
    try {
      await runMigrations();
      
      // Update test status to passed if migration completed
      if (isComplete) {
        setTestResults(prev => prev.map(test => ({ 
          ...test, 
          status: 'passed',
          message: 'Migration completed successfully'
        })));
      }
    } catch (err) {
      // Update test status to failed
      setTestResults(prev => prev.map(test => ({ 
        ...test, 
        status: 'failed',
        message: err instanceof Error ? err.message : 'Unknown error'
      })));
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Clock className="h-4 w-4 text-yellow-600 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      passed: 'default' as const,
      failed: 'destructive' as const,
      running: 'secondary' as const,
      pending: 'outline' as const
    };

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Migration Test Controls</CardTitle>
          <CardDescription>
            Run database migration tests to validate the system setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={runTests}
            disabled={isRunning}
            className="w-full sm:w-auto"
          >
            {isRunning ? 'Running Tests...' : 'Run Migration Tests'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Test Results</h3>
        
        {testResults.map((test, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(test.status)}
                  <h4 className="font-medium">{test.name}</h4>
                </div>
                {getStatusBadge(test.status)}
              </div>
              {test.message && (
                <p className="text-sm text-muted-foreground mt-2">{test.message}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {isComplete && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            ✅ All migrations completed successfully! Database foundation is ready.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
