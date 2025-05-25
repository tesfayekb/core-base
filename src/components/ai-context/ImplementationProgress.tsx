
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAIContext } from "@/hooks/useAIContext";
import { CheckCircle, Clock, AlertTriangle, Target, ListTodo } from "lucide-react";

export const ImplementationProgress: React.FC = () => {
  const { contextData, isLoading, lastUpdated, overallCompletion } = useAIContext();

  if (isLoading) {
    return <div className="p-4">Loading implementation progress...</div>;
  }

  if (!contextData) {
    return <div className="p-4">No implementation data available</div>;
  }

  const { phases } = contextData.implementationState;

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Overall Implementation Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Total Completion</span>
              <span className="text-2xl font-bold">{overallCompletion}%</span>
            </div>
            <Progress value={overallCompletion} className="h-3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold">Phase 1</div>
                <div className="text-muted-foreground">Foundation</div>
                <div className={getPhaseColor(phases.find(p => p.phase === 1)?.completionPercentage || 0)}>
                  {phases.find(p => p.phase === 1)?.completionPercentage || 0}%
                </div>
              </div>
              <div className="text-center">
                <div className="font-semibold">Phase 2</div>
                <div className="text-muted-foreground">Core Features</div>
                <div className={getPhaseColor(phases.find(p => p.phase === 2)?.completionPercentage || 0)}>
                  {phases.find(p => p.phase === 2)?.completionPercentage || 0}%
                </div>
              </div>
              <div className="text-center">
                <div className="font-semibold">Phase 3</div>
                <div className="text-muted-foreground">Advanced</div>
                <div className={getPhaseColor(phases.find(p => p.phase === 3)?.completionPercentage || 0)}>
                  {phases.find(p => p.phase === 3)?.completionPercentage || 0}%
                </div>
              </div>
              <div className="text-center">
                <div className="font-semibold">Phase 4</div>
                <div className="text-muted-foreground">Production</div>
                <div className={getPhaseColor(phases.find(p => p.phase === 4)?.completionPercentage || 0)}>
                  {phases.find(p => p.phase === 4)?.completionPercentage || 0}%
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Phase-by-Phase Breakdown */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Phases</TabsTrigger>
          <TabsTrigger value="phase1">Phase 1</TabsTrigger>
          <TabsTrigger value="phase2">Phase 2</TabsTrigger>
          <TabsTrigger value="phase3">Phase 3</TabsTrigger>
          <TabsTrigger value="phase4">Phase 4</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {phases.map((phase) => (
              <PhaseCard key={phase.phase} phase={phase} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="phase1">
          <PhaseDetailView phases={phases.filter(p => p.phase === 1)} phaseNumber={1} />
        </TabsContent>

        <TabsContent value="phase2">
          <PhaseDetailView phases={phases.filter(p => p.phase === 2)} phaseNumber={2} />
        </TabsContent>

        <TabsContent value="phase3">
          <PhaseDetailView phases={phases.filter(p => p.phase === 3)} phaseNumber={3} />
        </TabsContent>

        <TabsContent value="phase4">
          <PhaseDetailView phases={phases.filter(p => p.phase === 4)} phaseNumber={4} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const PhaseCard: React.FC<{ phase: any }> = ({ phase }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Phase {phase.phase}: {phase.name}</span>
          {phase.completed ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : phase.completionPercentage > 0 ? (
            <Clock className="h-5 w-5 text-yellow-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-gray-400" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span>Progress</span>
          <span className="font-medium">{phase.completionPercentage}%</span>
        </div>
        <Progress value={phase.completionPercentage} />
        
        {phase.completedFeatures.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 text-green-700 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Completed ({phase.completedFeatures.length})
            </h4>
            <div className="flex flex-wrap gap-1">
              {phase.completedFeatures.slice(0, 3).map((feature: string) => (
                <Badge key={feature} variant="secondary" className="text-xs bg-green-100 text-green-800">
                  {feature}
                </Badge>
              ))}
              {phase.completedFeatures.length > 3 && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                  +{phase.completedFeatures.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {phase.pendingFeatures.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 text-gray-700 flex items-center gap-1">
              <ListTodo className="h-4 w-4" />
              Pending ({phase.pendingFeatures.length})
            </h4>
            <div className="flex flex-wrap gap-1">
              {phase.pendingFeatures.slice(0, 3).map((feature: string) => (
                <Badge key={feature} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
              {phase.pendingFeatures.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{phase.pendingFeatures.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const PhaseDetailView: React.FC<{ phases: any[], phaseNumber: number }> = ({ phases, phaseNumber }) => {
  const phase = phases[0];
  
  if (!phase) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Phase {phaseNumber} data not available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Phase {phaseNumber}: {phase.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={phase.completionPercentage} className="h-3" />
            </div>
            <span className="font-bold text-lg">{phase.completionPercentage}%</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Completed Features ({phase.completedFeatures.length})
              </h3>
              {phase.completedFeatures.length > 0 ? (
                <ul className="space-y-2">
                  {phase.completedFeatures.map((feature: string) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No features completed yet</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <ListTodo className="h-5 w-5" />
                Pending Features ({phase.pendingFeatures.length})
              </h3>
              {phase.pendingFeatures.length > 0 ? (
                <ul className="space-y-2">
                  {phase.pendingFeatures.map((feature: string) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">All features completed!</p>
              )}
            </div>
          </div>

          {/* Validation Status */}
          {(phase.validationStatus.warnings.length > 0 || phase.validationStatus.errors.length > 0) && (
            <div className="space-y-3">
              <h3 className="font-semibold">Validation Status</h3>
              
              {phase.validationStatus.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-red-700 font-medium">Errors</h4>
                  {phase.validationStatus.errors.map((error: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">{error}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {phase.validationStatus.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-yellow-700 font-medium">Warnings</h4>
                  {phase.validationStatus.warnings.map((warning: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-yellow-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function getPhaseColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 50) return 'text-yellow-600';
  if (percentage > 0) return 'text-orange-600';
  return 'text-gray-400';
}
