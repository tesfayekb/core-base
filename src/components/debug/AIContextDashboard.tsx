
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { aiContextDebugger, DebugSession, ContextVisualization } from '@/services/AIContextDebugger';
import { aiContextService } from '@/services/AIContextService';

export const AIContextDashboard = () => {
  const [sessions, setSessions] = useState<DebugSession[]>([]);
  const [visualization, setVisualization] = useState<ContextVisualization | null>(null);
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [newOverrideKey, setNewOverrideKey] = useState('');
  const [newOverrideValue, setNewOverrideValue] = useState('');
  const [isDebugging, setIsDebugging] = useState(false);

  useEffect(() => {
    loadDebugData();
  }, []);

  const loadDebugData = async () => {
    setSessions(aiContextDebugger.getDebugSessions());
    setOverrides(aiContextDebugger.getOverrides());
    
    // Generate visualization for latest context
    const contextData = await aiContextService.generateAIContext();
    const viz = aiContextDebugger.visualizeContext(contextData);
    setVisualization(viz);
  };

  const captureSession = async () => {
    await aiContextDebugger.captureDebugSession();
    loadDebugData();
  };

  const toggleDebugging = () => {
    if (isDebugging) {
      aiContextDebugger.stopDebugging();
    } else {
      aiContextDebugger.startDebugging();
    }
    setIsDebugging(!isDebugging);
  };

  const addOverride = () => {
    if (newOverrideKey && newOverrideValue) {
      try {
        const value = JSON.parse(newOverrideValue);
        aiContextDebugger.setOverride(newOverrideKey, value);
        setNewOverrideKey('');
        setNewOverrideValue('');
        setOverrides(aiContextDebugger.getOverrides());
      } catch (error) {
        console.error('Invalid JSON value:', error);
      }
    }
  };

  const removeOverride = (key: string) => {
    aiContextDebugger.removeOverride(key);
    setOverrides(aiContextDebugger.getOverrides());
  };

  const exportData = () => {
    const data = aiContextDebugger.exportDebugData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-context-debug-${Date.now()}.json`;
    a.click();
  };

  const metrics = aiContextDebugger.getPerformanceMetrics();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">AI Context Debug Dashboard</h1>
        <div className="space-x-2">
          <Button onClick={toggleDebugging} variant={isDebugging ? "destructive" : "default"}>
            {isDebugging ? 'Stop' : 'Start'} Debugging
          </Button>
          <Button onClick={captureSession}>Capture Session</Button>
          <Button onClick={exportData} variant="outline">Export Data</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Generation Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageGenerationTime.toFixed(0)}ms</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cache Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.cacheHitRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Data Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.averageDataSize / 1024).toFixed(1)}KB</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Debug Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.sessionsCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="visualization" className="w-full">
        <TabsList>
          <TabsTrigger value="visualization">Context Visualization</TabsTrigger>
          <TabsTrigger value="sessions">Debug Sessions</TabsTrigger>
          <TabsTrigger value="overrides">Manual Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="visualization" className="space-y-4">
          {visualization && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Implementation Phases</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {visualization.phases.map((phase) => (
                      <div key={phase.phase}>
                        <div className="flex justify-between mb-2">
                          <span>Phase {phase.phase}</span>
                          <span>{phase.completion.toFixed(0)}%</span>
                        </div>
                        <Progress value={phase.completion} className="mb-2" />
                        <div className="text-sm text-gray-600">
                          {phase.features.length} features, {phase.blockers.length} blockers
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Current Capabilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {visualization.capabilities.map((category) => (
                      <div key={category.category}>
                        <h4 className="font-medium mb-2">{category.category}</h4>
                        <div className="flex flex-wrap gap-1">
                          {category.items.map((item, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AI Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {visualization.suggestions.map((suggestion, index) => (
                      <div key={index} className="border rounded p-3">
                        <div className="flex justify-between items-start mb-1">
                          <Badge variant={
                            suggestion.priority === 'high' ? 'destructive' :
                            suggestion.priority === 'medium' ? 'default' : 'secondary'
                          }>
                            {suggestion.priority}
                          </Badge>
                          <span className="text-xs text-gray-500">{suggestion.category}</span>
                        </div>
                        <p className="text-sm">{suggestion.text}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Debug Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div key={session.id} className="border rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium">{session.id}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {session.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <Badge variant={session.performance.cacheHit ? "secondary" : "outline"}>
                        {session.performance.cacheHit ? "Cache Hit" : "Cache Miss"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Generation Time:</span>
                        <div>{session.performance.generationTime}ms</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Data Size:</span>
                        <div>{(session.performance.dataSize / 1024).toFixed(1)}KB</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Overrides:</span>
                        <div>{Object.keys(session.userOverrides).length}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overrides">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Override</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="override-key">Key</Label>
                  <Input
                    id="override-key"
                    value={newOverrideKey}
                    onChange={(e) => setNewOverrideKey(e.target.value)}
                    placeholder="e.g., overallCompletion"
                  />
                </div>
                <div>
                  <Label htmlFor="override-value">Value (JSON)</Label>
                  <Textarea
                    id="override-value"
                    value={newOverrideValue}
                    onChange={(e) => setNewOverrideValue(e.target.value)}
                    placeholder="e.g., 85"
                  />
                </div>
                <Button onClick={addOverride} className="w-full">
                  Add Override
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Overrides</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(overrides).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <span className="font-medium">{key}</span>
                        <div className="text-sm text-gray-600">
                          {JSON.stringify(value)}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeOverride(key)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {Object.keys(overrides).length === 0 && (
                    <p className="text-gray-500 text-center py-4">No overrides active</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
