
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAIContext } from "@/hooks/useAIContext";
import { aiContextService } from "@/services/AIContextService";
import { CheckCircle, Clock, AlertCircle, Target, ChevronDown, ChevronRight, RefreshCw, Database, FileText } from "lucide-react";

export const DetailedImplementationProgress: React.FC = () => {
  const { 
    contextData, 
    isLoading, 
    overallCompletion,
    currentPhase,
    refreshContext
  } = useAIContext();

  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([1])); // Phase 1 expanded by default
  const [isScanning, setIsScanning] = useState(false);

  const togglePhase = (phaseNumber: number) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseNumber)) {
      newExpanded.delete(phaseNumber);
    } else {
      newExpanded.add(phaseNumber);
    }
    setExpandedPhases(newExpanded);
  };

  const handleForceRescan = async () => {
    setIsScanning(true);
    try {
      console.log('🔄 Force rescan requested by user...');
      await aiContextService.generateAIContext(true); // Force rescan
      await refreshContext(); // Refresh the UI
      console.log('✅ Force rescan completed');
    } catch (error) {
      console.error('❌ Force rescan failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  if (isLoading && !contextData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading implementation progress...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!contextData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            No Implementation Data Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">No implementation data could be loaded from the database.</p>
            <Button onClick={handleForceRescan} disabled={isScanning}>
              {isScanning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Scanning Codebase...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Force Rescan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const phases = contextData.implementationState.phases || [];

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Overall Implementation Progress
            </div>
            <Button 
              variant="outline" 
              onClick={handleForceRescan} 
              disabled={isScanning}
              className="ml-auto"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Scanning...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Force Rescan
                </>
              )}
            </Button>
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
            <div className="text-xs text-muted-foreground">
              Last scanned: {contextData.implementationState.lastScanned ? 
                new Date(contextData.implementationState.lastScanned).toLocaleString() : 
                'Never'
              }
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Phase-by-Phase Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Phase Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {phases.map((phase) => (
              <div key={phase.phase} className="border rounded-lg">
                {/* Phase Header - Clickable */}
                <div 
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => togglePhase(phase.phase)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedPhases.has(phase.phase) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {phase.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : phase.completionPercentage > 0 ? (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-gray-400" />
                      )}
                      <h3 className="font-medium">Phase {phase.phase}: {phase.name}</h3>
                    </div>
                    <Badge 
                      variant={phase.completed ? "default" : phase.completionPercentage > 0 ? "secondary" : "outline"}
                    >
                      {phase.completionPercentage}%
                    </Badge>
                  </div>
                  
                  <div className="mt-3 ml-7">
                    <Progress value={phase.completionPercentage} className="w-full" />
                  </div>
                </div>

                {/* Expandable Content */}
                {expandedPhases.has(phase.phase) && (
                  <div className="border-t bg-muted/20">
                    {/* Task Details */}
                    {phase.detailedTasks && phase.detailedTasks.length > 0 ? (
                      <div className="p-4 space-y-3">
                        <h4 className="font-medium text-sm">Task Details:</h4>
                        {phase.detailedTasks.map((task) => (
                          <div key={task.taskId} className="border rounded p-3 bg-background">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {task.status === 'completed' ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : task.status === 'in_progress' ? (
                                  <Clock className="h-4 w-4 text-yellow-600" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="font-medium text-sm">{task.taskId}: {task.taskName}</span>
                              </div>
                              <Badge variant="outline">
                                {task.completionPercentage}%
                              </Badge>
                            </div>
                            
                            <Progress value={task.completionPercentage} className="mb-2" />
                            
                            {/* Evidence Display */}
                            {task.evidence && Object.keys(task.evidence).length > 0 && (
                              <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                                <div className="flex items-center gap-2 mb-1">
                                  <FileText className="h-3 w-3" />
                                  <span className="font-medium">Evidence:</span>
                                </div>
                                <pre className="text-xs overflow-x-auto">
                                  {JSON.stringify(task.evidence, null, 2)}
                                </pre>
                              </div>
                            )}
                            
                            {task.completedAt && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Completed: {new Date(task.completedAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4">
                        {/* Feature Lists */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {/* Completed Features */}
                          <div>
                            <h4 className="font-medium text-green-700 mb-2">
                              Completed ({phase.completedFeatures.length})
                            </h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {phase.completedFeatures.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                                  <span className="text-xs">{feature}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Pending Features */}
                          <div>
                            <h4 className="font-medium text-orange-700 mb-2">
                              Pending ({phase.pendingFeatures.length})
                            </h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {phase.pendingFeatures.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <Clock className="h-3 w-3 text-orange-600 flex-shrink-0" />
                                  <span className="text-xs">{feature}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Validation Status */}
                    {(phase.validationStatus.errors.length > 0 || phase.validationStatus.warnings.length > 0) && (
                      <div className="border-t p-4">
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
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
