
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Download,
  Upload,
  BarChart3
} from 'lucide-react';
import { implementationStateManager } from '@/services/implementation/ImplementationStateManager';
import { aiImplementationAdvisor } from '@/services/implementation/AIImplementationAdvisor';

export const ImplementationProgressDashboard: React.FC = () => {
  const [progress, setProgress] = useState<any>(null);
  const [progressReport, setProgressReport] = useState<string>('');

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = () => {
    const currentProgress = implementationStateManager.getAllProgress();
    const report = aiImplementationAdvisor.generateProgressReport();
    setProgress(currentProgress);
    setProgressReport(report);
  };

  const handleExportState = () => {
    const state = implementationStateManager.exportState();
    const blob = new Blob([state], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `implementation-state-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportState = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const success = implementationStateManager.importState(content);
        if (success) {
          loadProgress();
          alert('State imported successfully!');
        } else {
          alert('Failed to import state. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  if (!progress) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading implementation progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Implementation Progress Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={handleExportState} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export State
          </Button>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleImportState}
              className="hidden"
            />
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import State
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Overall Implementation Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Total Progress</span>
                <span>{progress.overallCompletion}%</span>
              </div>
              <Progress value={progress.overallCompletion} className="h-3" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {progress.phases.map((phase: any) => (
                <div key={phase.phaseId} className="text-center">
                  <div className="text-sm font-medium mb-1">{phase.phaseName}</div>
                  <Progress value={phase.validationPercentage} className="h-2" />
                  <div className="text-xs text-muted-foreground mt-1">
                    {phase.validationPercentage}% validated
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="phases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="phases">Phase Progress</TabsTrigger>
          <TabsTrigger value="report">Detailed Report</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="phases" className="space-y-4">
          <div className="grid gap-4">
            {progress.phases.map((phase: any) => (
              <Card key={phase.phaseId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{phase.phaseName}</span>
                    <Badge variant={phase.readyForNextPhase ? "default" : "secondary"}>
                      {phase.readyForNextPhase ? "Ready" : "In Progress"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium mb-1">Completion</div>
                        <Progress value={phase.completionPercentage} className="h-2" />
                        <div className="text-xs text-muted-foreground mt-1">
                          {phase.completedTasks}/{phase.totalTasks} tasks
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-1">Validation</div>
                        <Progress value={phase.validationPercentage} className="h-2" />
                        <div className="text-xs text-muted-foreground mt-1">
                          {phase.validatedTasks}/{phase.totalTasks} validated
                        </div>
                      </div>
                    </div>

                    {phase.blockers.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Blockers:</strong> {phase.blockers.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-2">
                      {phase.completionPercentage === 100 && (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          All Tasks Complete
                        </Badge>
                      )}
                      {phase.validationPercentage >= 85 && (
                        <Badge variant="outline" className="text-blue-600">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Ready for Next Phase
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Implementation Report</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto">
                {progressReport}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Enterprise Implementation Guidelines:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Never rework completed and validated tasks</li>
                  <li>Follow phase-based implementation sequence</li>
                  <li>Validate each task before proceeding</li>
                  <li>Maintain comprehensive documentation</li>
                  <li>Use automated testing for all implementations</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Next Recommended Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {progress.phases.map((phase: any) => {
                    if (phase.blockers.length > 0) {
                      return (
                        <Alert key={phase.phaseId}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>{phase.phaseName}:</strong> Resolve {phase.blockers.length} blocker(s) before proceeding
                          </AlertDescription>
                        </Alert>
                      );
                    }
                    
                    if (phase.completionPercentage < 100) {
                      return (
                        <Alert key={phase.phaseId}>
                          <Clock className="h-4 w-4" />
                          <AlertDescription>
                            <strong>{phase.phaseName}:</strong> Complete remaining {phase.totalTasks - phase.completedTasks} task(s)
                          </AlertDescription>
                        </Alert>
                      );
                    }
                    
                    if (phase.validationPercentage < 85) {
                      return (
                        <Alert key={phase.phaseId}>
                          <TrendingUp className="h-4 w-4" />
                          <AlertDescription>
                            <strong>{phase.phaseName}:</strong> Validate {phase.totalTasks - phase.validatedTasks} remaining task(s)
                          </AlertDescription>
                        </Alert>
                      );
                    }
                    
                    return null;
                  }).filter(Boolean)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImplementationProgressDashboard;
