
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingWrapper } from "@/components/ui/loading-wrapper";
import { useAIContext } from "@/hooks/useAIContext";
import { CheckCircle, Clock, AlertCircle, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export const DetailedImplementationProgress: React.FC = () => {
  const { 
    contextData, 
    isLoading, 
    error,
    refreshContext,
    overallCompletion,
    currentPhase 
  } = useAIContext();

  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([1]));

  const togglePhase = (phaseNumber: number) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseNumber)) {
      newExpanded.delete(phaseNumber);
    } else {
      newExpanded.add(phaseNumber);
    }
    setExpandedPhases(newExpanded);
  };

  return (
    <LoadingWrapper
      loading={isLoading}
      error={error}
      onRetry={refreshContext}
    >
      <div className="space-y-6">
        {/* Overall Progress Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Implementation Progress Dashboard
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshContext}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{overallCompletion}%</div>
                <div className="text-sm text-muted-foreground">Overall Complete</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{currentPhase}</div>
                <div className="text-sm text-muted-foreground">Current Phase</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {contextData?.implementationState.phases?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Phases</div>
              </div>
            </div>
            <Progress value={overallCompletion} className="w-full" />
          </CardContent>
        </Card>

        {/* Phase Details */}
        {contextData?.implementationState.phases?.map((phase) => (
          <Card key={phase.phase}>
            <Collapsible
              open={expandedPhases.has(phase.phase)}
              onOpenChange={() => togglePhase(phase.phase)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {phase.completed ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : phase.completionPercentage > 0 ? (
                        <Clock className="h-6 w-6 text-yellow-600" />
                      ) : (
                        <AlertCircle className="h-6 w-6 text-gray-400" />
                      )}
                      <div>
                        <CardTitle className="text-lg">
                          Phase {phase.phase}: {phase.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={phase.completed ? "default" : "secondary"}>
                            {phase.completionPercentage}%
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {phase.completedFeatures.length} completed, {phase.pendingFeatures.length} pending
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedPhases.has(phase.phase) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                  <Progress value={phase.completionPercentage} className="mt-2" />
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Completed Features */}
                    <div>
                      <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Completed Features ({phase.completedFeatures.length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {phase.completedFeatures.length > 0 ? (
                          phase.completedFeatures.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2 bg-green-50 rounded">
                              <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-green-800">{feature}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No completed features yet</p>
                        )}
                      </div>
                    </div>

                    {/* Pending Features */}
                    <div>
                      <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Pending Features ({phase.pendingFeatures.length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {phase.pendingFeatures.length > 0 ? (
                          phase.pendingFeatures.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2 bg-orange-50 rounded">
                              <Clock className="h-3 w-3 text-orange-600 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-orange-800">{feature}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No pending features</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Validation Status */}
                  {(phase.validationStatus.errors.length > 0 || phase.validationStatus.warnings.length > 0) && (
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Validation Issues
                      </h4>
                      <div className="space-y-2">
                        {phase.validationStatus.errors.map((error, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-red-50 rounded">
                            <AlertCircle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-red-800">{error}</span>
                          </div>
                        ))}
                        {phase.validationStatus.warnings.map((warning, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-yellow-50 rounded">
                            <AlertCircle className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-yellow-800">{warning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )) || (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No phase data available</p>
            </CardContent>
          </Card>
        )}
      </div>
    </LoadingWrapper>
  );
};
