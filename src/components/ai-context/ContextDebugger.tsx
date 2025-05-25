
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIContextDebug } from "@/hooks/useAIContextDebug";
import { ContextVisualizer } from "@/components/debug/ContextVisualizer";
import { Download, Play, Square, RefreshCw } from "lucide-react";

export const ContextDebugger: React.FC = () => {
  const {
    sessions,
    isDebugging,
    overrides,
    startDebugging,
    stopDebugging,
    captureSession,
    exportDebugData,
    getPerformanceMetrics,
    refreshData
  } = useAIContextDebug();

  const performanceMetrics = getPerformanceMetrics();
  const latestSession = sessions[sessions.length - 1];

  return (
    <div className="space-y-6">
      {/* Debug Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={isDebugging ? stopDebugging : startDebugging}
              variant={isDebugging ? "destructive" : "default"}
              size="sm"
            >
              {isDebugging ? <Square className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isDebugging ? 'Stop' : 'Start'} Debugging
            </Button>
            
            <Button onClick={captureSession} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Capture Session
            </Button>
            
            <Button onClick={exportDebugData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Sessions</p>
              <p className="font-medium">{sessions.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Avg Gen Time</p>
              <p className="font-medium">{Math.round(performanceMetrics.averageGenerationTime)}ms</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cache Hit Rate</p>
              <p className="font-medium">{Math.round(performanceMetrics.cacheHitRate)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Overrides</p>
              <p className="font-medium">{Object.keys(overrides).length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Context Visualization */}
      {latestSession && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Context Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <ContextVisualizer 
              visualization={{
                phases: latestSession.contextData.implementationState.phases.map(phase => ({
                  phase: phase.phase,
                  completion: phase.completionPercentage,
                  features: phase.completedFeatures,
                  blockers: phase.validationStatus.warnings
                })),
                capabilities: [
                  {
                    category: 'System',
                    items: latestSession.contextData.currentCapabilities
                  }
                ],
                suggestions: latestSession.contextData.suggestions.map(suggestion => ({
                  priority: 'medium' as const,
                  text: suggestion,
                  category: 'General'
                }))
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Debug Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Debug Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground">No debug sessions captured yet</p>
          ) : (
            <div className="space-y-2">
              {sessions.slice(-5).reverse().map((session) => (
                <div key={session.id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">{session.timestamp.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.performance.generationTime}ms • {session.performance.dataSize} bytes
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={session.performance.cacheHit ? "secondary" : "outline"}>
                      {session.performance.cacheHit ? 'Cache Hit' : 'Fresh'}
                    </Badge>
                    {Object.keys(session.userOverrides).length > 0 && (
                      <Badge variant="outline">
                        {Object.keys(session.userOverrides).length} overrides
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
