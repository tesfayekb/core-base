
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAIContext } from "@/hooks/useAIContext";
import { CheckCircle, Clock, AlertCircle, ChevronDown, ChevronRight, RefreshCw, Database, FileText } from "lucide-react";

export const DetailedImplementationProgress: React.FC = () => {
  const { 
    contextData, 
    isLoading, 
    overallCompletion,
    currentPhase,
    refreshContext
  } = useAIContext();

  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([1])); // Start with Phase 1 expanded
  const [isForceScanning, setIsForceScanning] = useState(false);

  const togglePhase = (phaseNumber: number) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseNumber)) {
      newExpanded.delete(phaseNumber);
    } else {
      newExpanded.add(phaseNumber);
    }
    setExpandedPhases(newExpanded);
  };

  const handleForceScan = async () => {
    setIsForceScanning(true);
    try {
      // Import and use the enhanced scanner with force rescan
      const { enhancedImplementationStateScanner } = await import('@/services/EnhancedImplementationStateScanner');
      await enhancedImplementationStateScanner.scanImplementationState(true);
      await refreshContext();
    } catch (error) {
      console.error('Force scan failed:', error);
    } finally {
      setIsForceScanning(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading Implementation Progress...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Analyzing codebase and database state...</p>
        </CardContent>
      </Card>
    );
  }

  if (!contextData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Implementation Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No implementation progress data available</p>
        </CardContent>
      </Card>
    );
  }

  const phases = contextData.implementationState.phases || [];

  return (
    <div className="space-y-6">
      {/* Overall Progress with Scan Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Implementation Progress (Database Integrated)
            </CardTitle>
            <Button 
              onClick={handleForceScan}
              disabled={isForceScanning}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {isForceScanning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isForceScanning ? 'Scanning...' : 'Force Rescan'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Completion</span>
              <span className="text-2xl font-bold text-green-600">{overallCompletion}%</span>
            </div>
            <Progress value={overallCompletion} className="w-full" />
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current Phase:</span>
                <span className="ml-2 font-medium">Phase {currentPhase}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Phases:</span>
                <span className="ml-2 font-medium">{phases.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Data Source:</span>
                <span className="ml-2 font-medium text-blue-600">Database</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Phase Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Phase-by-Phase Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {phases.map((phase) => {
              const isExpanded = expandedPhases.has(phase.phase);
              const hasDetailedTasks = phase.detailedTasks && phase.detailedTasks.length > 0;
              
              return (
                <div key={phase.phase} className="border rounded-lg">
                  <Collapsible open={isExpanded} onOpenChange={() => togglePhase(phase.phase)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
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
                          <div>
                            <h3 className="font-medium">Phase {phase.phase}: {phase.name}</h3>
                            {hasDetailedTasks && (
                              <p className="text-xs text-muted-foreground">
                                {phase.detailedTasks!.length} tasks • {phase.detailedTasks!.filter(t => t.status === 'completed').length} completed
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={phase.completed ? "default" : phase.completionPercentage > 0 ? "secondary" : "outline"}
                          >
                            {phase.completionPercentage}%
                          </Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-4">
                        <Progress value={phase.completionPercentage} className="w-full" />
                        
                        {/* Detailed Tasks */}
                        {hasDetailedTasks && (
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Task Details
                            </h4>
                            {phase.detailedTasks!.map((task) => (
                              <div key={task.taskId} className="bg-gray-50 rounded p-3 space-y-2">
                                <div className="flex items-center justify-between">
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
                                  <Badge size="sm" variant={
                                    task.status === 'completed' ? 'default' : 
                                    task.status === 'in_progress' ? 'secondary' : 'outline'
                                  }>
                                    {task.completionPercentage}%
                                  </Badge>
                                </div>
                                
                                {task.completionPercentage > 0 && (
                                  <Progress value={task.completionPercentage} className="h-2" />
                                )}
                                
                                {/* Evidence from scan */}
                                {task.evidence && Object.keys(task.evidence).length > 0 && (
                                  <div className="text-xs space-y-1">
                                    {task.evidence.files_analyzed && task.evidence.files_analyzed.length > 0 && (
                                      <p className="text-blue-600">
                                        📁 Files: {task.evidence.files_analyzed.slice(0, 3).join(', ')}
                                        {task.evidence.files_analyzed.length > 3 && ` +${task.evidence.files_analyzed.length - 3} more`}
                                      </p>
                                    )}
                                    {task.evidence.features_detected && task.evidence.features_detected.length > 0 && (
                                      <p className="text-green-600">
                                        ✅ Features: {task.evidence.features_detected.slice(0, 2).join(', ')}
                                        {task.evidence.features_detected.length > 2 && ` +${task.evidence.features_detected.length - 2} more`}
                                      </p>
                                    )}
                                    {task.evidence.scan_timestamp && (
                                      <p className="text-gray-500">
                                        🕒 Last scanned: {new Date(task.evidence.scan_timestamp).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {task.completedAt && (
                                  <p className="text-xs text-gray-500">
                                    Completed: {new Date(task.completedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Legacy features display for backward compatibility */}
                        {!hasDetailedTasks && (
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
                          <div className="pt-3 border-t">
                            <h4 className="font-medium text-red-700 mb-2">Validation Issues</h4>
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
                  </Collapsible>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
