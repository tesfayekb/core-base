
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAIContext } from "@/hooks/useAIContext";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";

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
          <CardTitle>Overall Implementation Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Total Completion</span>
              <span className="text-2xl font-bold">{overallCompletion}%</span>
            </div>
            <Progress value={overallCompletion} className="h-3" />
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Phase Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {phases.map((phase) => (
          <Card key={phase.phase}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Phase {phase.phase}: {phase.name}
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
                  <h4 className="font-medium mb-2 text-green-700">Completed Features</h4>
                  <div className="flex flex-wrap gap-1">
                    {phase.completedFeatures.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs bg-green-100 text-green-800">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {phase.pendingFeatures.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-gray-700">Pending Features</h4>
                  <div className="flex flex-wrap gap-1">
                    {phase.pendingFeatures.slice(0, 3).map((feature) => (
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
        ))}
      </div>
    </div>
  );
};
