
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAIContext } from "@/hooks/useAIContext";
import { CheckCircle, Clock, AlertCircle, Target } from "lucide-react";

export const ImplementationProgress: React.FC = () => {
  const { 
    contextData, 
    isLoading, 
    overallCompletion,
    currentPhase 
  } = useAIContext();

  if (isLoading) {
    return <div className="p-4">Loading implementation progress...</div>;
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

      {/* Phase-by-Phase Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Phase-by-Phase Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {phases.map((phase, index) => (
              <div key={phase.phase} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
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
                
                <Progress value={phase.completionPercentage} className="mb-3" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {/* Completed Features */}
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
                  
                  {/* Pending Features */}
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
