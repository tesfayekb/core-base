
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAIContext } from "@/hooks/useAIContext";
import { CheckCircle, Clock, AlertCircle, Target, ChevronDown, ChevronRight } from "lucide-react";
import { DetailedTask } from "@/types/ImplementationState";

export const DetailedImplementationProgress: React.FC = () => {
  const { 
    contextData, 
    isLoading, 
    overallCompletion,
    currentPhase 
  } = useAIContext();

  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([currentPhase]));

  const togglePhase = (phaseNumber: number) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseNumber)) {
      newExpanded.delete(phaseNumber);
    } else {
      newExpanded.add(phaseNumber);
    }
    setExpandedPhases(newExpanded);
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTaskStatusBadge = (task: DetailedTask) => {
    const { status, completionPercentage } = task;
    
    if (status === 'completed') {
      return <Badge variant="default" className="text-xs">Completed</Badge>;
    } else if (status === 'in_progress') {
      return <Badge variant="secondary" className="text-xs">{completionPercentage}%</Badge>;
    } else {
      return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading detailed implementation progress...</div>;
  }

  if (!contextData) {
    return <div className="p-4">No implementation data available</div>;
  }

  const phases = contextData.implementationState.phases || [];

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
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Completion</span>
              <span className="text-2xl font-bold">{overallCompletion}%</span>
            </div>
            <Progress value={overallCompletion} className="w-full" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current Phase:</span>
                <span className="ml-2 font-medium">Phase {currentPhase}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Phases:</span>
                <span className="ml-2 font-medium">{phases.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Phase-by-Phase Progress with Expandable Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Phase Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {phases.map((phase) => (
              <Collapsible 
                key={phase.phase}
                open={expandedPhases.has(phase.phase)}
                onOpenChange={() => togglePhase(phase.phase)}
              >
                <div className="border rounded-lg">
                  <CollapsibleTrigger className="w-full p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {phase.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : phase.completionPercentage > 0 ? (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-gray-400" />
                        )}
                        <h3 className="font-medium">Phase {phase.phase}: {phase.name}</h3>
                        {expandedPhases.has(phase.phase) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      <Badge 
                        variant={phase.completed ? "default" : phase.completionPercentage > 0 ? "secondary" : "outline"}
                      >
                        {phase.completionPercentage}%
                      </Badge>
                    </div>
                    
                    <div className="mt-3">
                      <Progress value={phase.completionPercentage} className="w-full" />
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="p-4 pt-0 border-t">
                      {/* Show detailed tasks if available */}
                      {phase.detailedTasks && phase.detailedTasks.length > 0 ? (
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm text-gray-700 mb-3">Tasks ({phase.detailedTasks.length})</h4>
                          {phase.detailedTasks.map((task, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                              <div className="flex items-center gap-3">
                                {getTaskStatusIcon(task.status)}
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{task.taskId}: {task.taskName}</div>
                                  {task.completedAt && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Completed: {new Date(task.completedAt).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {task.status === 'in_progress' && (
                                  <div className="text-xs text-gray-600">{task.completionPercentage}%</div>
                                )}
                                {getTaskStatusBadge(task)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Fallback to feature lists if no detailed tasks */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <h4 className="font-medium text-green-700 mb-2">
                              Completed ({phase.completedFeatures.length})
                            </h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {phase.completedFeatures.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                  <span className="text-xs">{feature}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-orange-700 mb-2">
                              Pending ({phase.pendingFeatures.length})
                            </h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {phase.pendingFeatures.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <Clock className="h-3 w-3 text-orange-600" />
                                  <span className="text-xs">{feature}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Validation Status */}
                      {(phase.validationStatus.errors.length > 0 || phase.validationStatus.warnings.length > 0) && (
                        <div className="mt-3 pt-3 border-t">
                          <h4 className="font-medium text-red-700 mb-2">Issues</h4>
                          <div className="space-y-1">
                            {phase.validationStatus.errors.map((error, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <AlertCircle className="h-3 w-3 text-red-600" />
                                <span className="text-xs text-red-600">{error}</span>
                              </div>
                            ))}
                            {phase.validationStatus.warnings.map((warning, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <AlertCircle className="h-3 w-3 text-yellow-600" />
                                <span className="text-xs text-yellow-600">{warning}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
