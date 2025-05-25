
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { implementationStateManager } from '../../services/implementation/ImplementationStateManager';
import { useImplementationStateInitialization } from '../../hooks/useImplementationStateInitialization';
import { CheckCircle, AlertCircle, Clock, Play, BarChart3, Shield, Zap } from 'lucide-react';

export const ImplementationDashboard: React.FC = () => {
  const [progress, setProgress] = useState(implementationStateManager.getAllProgress());
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const { isInitialized, enforcementStatus, generateReport } = useImplementationStateInitialization();

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(implementationStateManager.getAllProgress());
      setLastUpdate(new Date());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getPhaseStatusIcon = (phase: any) => {
    if (phase.validationPercentage >= 85) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (phase.completionPercentage >= 50) return <Clock className="w-5 h-5 text-yellow-600" />;
    return <Play className="w-5 h-5 text-blue-600" />;
  };

  const getStatusBadge = (phase: any) => {
    if (phase.readyForNextPhase) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Complete</Badge>;
    }
    if (phase.completionPercentage > 0) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">In Progress</Badge>;
    }
    return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Not Started</Badge>;
  };

  const showReport = () => {
    const report = generateReport();
    console.log(report);
    alert('Prevention report generated! Check the console for details.');
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing implementation state system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Implementation Progress</h1>
          <p className="text-muted-foreground">Enterprise system implementation tracking with AI prevention</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Last updated: {lastUpdate.toLocaleTimeString()}</div>
          <div className="text-2xl font-bold text-primary">{progress.overallCompletion}% Complete</div>
        </div>
      </div>

      {/* AI Prevention System Status */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Shield className="w-5 h-5" />
            AI Prevention System
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              ACTIVE
            </Badge>
          </CardTitle>
          <CardDescription className="text-green-700">
            Automatically prevents rework of completed tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-green-600" />
              <div>
                <div className="font-semibold text-green-800">{enforcementStatus.tasksTracked}</div>
                <div className="text-sm text-green-600">Tasks Tracked</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <div className="font-semibold text-green-800">{enforcementStatus.preventedRework}</div>
                <div className="text-sm text-green-600">Prevented Rework</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={showReport} 
                variant="outline" 
                size="sm"
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Progress Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {progress.phases.map((phase) => (
          <Card key={phase.phaseId} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{phase.phaseName}</CardTitle>
                {getPhaseStatusIcon(phase)}
              </div>
              <CardDescription>Phase {phase.phaseId.replace('phase', '')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Completion</span>
                    <span>{phase.completionPercentage}%</span>
                  </div>
                  <Progress value={phase.completionPercentage} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Validation</span>
                    <span>{phase.validationPercentage}%</span>
                  </div>
                  <Progress value={phase.validationPercentage} className="h-2" />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {phase.validatedTasks}/{phase.totalTasks} validated
                  </span>
                  {getStatusBadge(phase)}
                </div>

                {phase.blockers.length > 0 && (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs">{phase.blockers.length} blockers</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ImplementationDashboard;
