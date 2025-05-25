
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAIContext } from "@/hooks/useAIContext";
import { CheckCircle, Clock, AlertTriangle, Zap, Database, Shield } from "lucide-react";

export const SystemCapabilities: React.FC = () => {
  const { 
    contextData, 
    isLoading, 
    error,
    overallCompletion,
    currentPhase,
    completedFeatures,
    currentCapabilities,
    blockers,
    recommendations 
  } = useAIContext();

  console.log('SystemCapabilities - contextData:', contextData);
  console.log('SystemCapabilities - isLoading:', isLoading);
  console.log('SystemCapabilities - error:', error);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              Loading System Capabilities...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Analyzing implementation state and capabilities...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contextData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No system capabilities data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{overallCompletion}%</div>
              <div className="text-sm text-muted-foreground">Overall Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{currentPhase}</div>
              <div className="text-sm text-muted-foreground">Current Phase</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{completedFeatures.length}</div>
              <div className="text-sm text-muted-foreground">Features Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{currentCapabilities.length}</div>
              <div className="text-sm text-muted-foreground">Active Capabilities</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Active System Capabilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentCapabilities.length > 0 ? (
              currentCapabilities.map((capability, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{capability}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No active capabilities detected</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completed Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Completed Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {completedFeatures.length > 0 ? (
              completedFeatures.map((feature, index) => (
                <Badge key={index} variant="default" className="text-xs">
                  {feature}
                </Badge>
              ))
            ) : (
              <p className="text-muted-foreground">No completed features detected</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Blockers */}
      {blockers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Active Blockers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {blockers.map((blocker, index) => (
                <div key={index} className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">{blocker}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recommendations.length > 0 ? (
              recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">{recommendation}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No recommendations available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
