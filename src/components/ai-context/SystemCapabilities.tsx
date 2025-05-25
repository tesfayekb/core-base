
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAIContext } from "@/hooks/useAIContext";
import { Activity, TrendingUp, AlertCircle } from "lucide-react";

export const SystemCapabilities: React.FC = () => {
  const { 
    contextData, 
    isLoading, 
    currentCapabilities, 
    completedFeatures, 
    blockers, 
    recommendations 
  } = useAIContext();

  if (isLoading) {
    return <div className="p-4">Loading system capabilities...</div>;
  }

  if (!contextData) {
    return <div className="p-4">No system data available</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Current Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Current Capabilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {currentCapabilities.length} capabilities active
            </p>
            <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto">
              {currentCapabilities.map((capability, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {capability}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completed Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Completed Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {completedFeatures.length} features completed
            </p>
            <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto">
              {completedFeatures.map((feature, index) => (
                <Badge key={index} variant="secondary" className="text-xs bg-green-100 text-green-800">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {blockers.length > 0 && (
              <div>
                <h4 className="font-medium text-red-700 mb-2">Active Blockers</h4>
                <div className="space-y-1">
                  {blockers.slice(0, 3).map((blocker, index) => (
                    <Badge key={index} variant="destructive" className="text-xs block w-full">
                      {blocker}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-700 mb-2">Recommendations</h4>
                <div className="space-y-1">
                  {recommendations.slice(0, 3).map((rec, index) => (
                    <Badge key={index} variant="outline" className="text-xs block w-full">
                      {rec}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
