
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  FileText,
  Code,
  TestTube,
  Clock
} from 'lucide-react';
import { implementationTracker, ImplementationPhase, ImplementationTask } from '../../services/implementation/ImplementationTracker';

export function ImplementationStatusDashboard() {
  const [summary, setSummary] = useState(implementationTracker.getImplementationSummary());
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<Map<string, boolean>>(new Map());
  const [lastVerification, setLastVerification] = useState<Date | null>(null);

  const runVerification = async () => {
    setIsVerifying(true);
    try {
      const results = await implementationTracker.verifyAllTasks();
      setVerificationResults(results);
      setSummary(implementationTracker.getImplementationSummary());
      setLastVerification(new Date());
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    // Run initial verification on component mount
    runVerification();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'implemented':
      case 'tested':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'not_started':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implemented':
      case 'tested':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'not_started':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const TaskCard = ({ task }: { task: ImplementationTask }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {getStatusIcon(task.status)}
            {task.name}
          </CardTitle>
          <Badge className={getStatusColor(task.status)}>
            {task.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-3">{task.description}</p>
        
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span>Completion</span>
            <span>{task.completionPercentage}%</span>
          </div>
          <Progress value={task.completionPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <FileText className="w-3 h-3" />
              <span className="font-medium">Documentation</span>
            </div>
            <p className="text-gray-600 text-xs">{task.documentationRef}</p>
          </div>
          
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Code className="w-3 h-3" />
              <span className="font-medium">Implementation Files</span>
            </div>
            <ul className="text-xs text-gray-600">
              {task.implementationFiles.slice(0, 2).map(file => (
                <li key={file} className="truncate">{file}</li>
              ))}
              {task.implementationFiles.length > 2 && (
                <li className="text-gray-500">+{task.implementationFiles.length - 2} more</li>
              )}
            </ul>
          </div>
          
          <div>
            <div className="flex items-center gap-1 mb-1">
              <TestTube className="w-3 h-3" />
              <span className="font-medium">Test Coverage</span>
            </div>
            <p className="text-xs text-gray-600">
              {task.testFiles.length > 0 ? `${task.testFiles.length} test files` : 'No tests'}
            </p>
          </div>
        </div>

        {task.lastVerified && (
          <div className="mt-3 text-xs text-gray-500">
            Last verified: {task.lastVerified.toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Implementation Status Dashboard</h2>
        <Button 
          onClick={runVerification} 
          disabled={isVerifying}
          className="gap-2"
        >
          {isVerifying && <RefreshCw className="w-4 h-4 animate-spin" />}
          {isVerifying ? 'Verifying...' : 'Verify Implementation'}
        </Button>
      </div>

      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center mb-4">
            <div>
              <div className="text-2xl font-bold text-green-600">{summary.implementedTasks}</div>
              <div className="text-sm text-gray-600">Implemented</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.totalTasks}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.phases.length}</div>
              <div className="text-sm text-gray-600">Phases</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{summary.overallCompletion}%</div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Overall Progress</span>
              <span>{summary.overallCompletion}%</span>
            </div>
            <Progress value={summary.overallCompletion} className="h-3" />
          </div>

          {lastVerification && (
            <p className="text-sm text-gray-500">
              Last verification: {lastVerification.toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Phase Details */}
      {summary.phases.map((phase: ImplementationPhase) => (
        <Card key={phase.phase}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(phase.status)}
                Phase {phase.phase}: {phase.name}
              </CardTitle>
              <Badge className={getStatusColor(phase.status)}>
                {phase.completionPercentage}% Complete
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Progress value={phase.completionPercentage} className="h-2" />
            </div>
            
            <div className="space-y-4">
              {phase.tasks.map((task: ImplementationTask) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
