// Migration Test Runner Component
// For manual testing and validation of migration system

import React, { useState } from 'react';
import { useMigrations } from '../../hooks/useMigrations';

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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Migration Test Runner</h1>
      
      <div className="mb-6">
        <button
          onClick={runTests}
          disabled={isRunning}
          className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 disabled:opacity-50"
        >
          {isRunning ? 'Running Tests...' : 'Run Migration Tests'}
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="space-y-4">
        {testResults.map((test, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{test.name}</h3>
              <span className={`px-2 py-1 rounded text-sm ${
                test.status === 'passed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                test.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                test.status === 'running' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                'bg-secondary text-secondary-foreground'
              }`}>
                {test.status}
              </span>
            </div>
            {test.message && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{test.message}</p>
            )}
          </div>
        ))}
      </div>

      {isComplete && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-800 dark:text-green-400 px-4 py-3 rounded mt-6">
          ✅ All migrations completed successfully! Database foundation is ready.
        </div>
      )}
    </div>
  );
}
