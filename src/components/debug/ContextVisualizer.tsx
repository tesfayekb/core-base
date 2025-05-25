
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ContextVisualization } from '@/services/AIContextDebugger';

interface ContextVisualizerProps {
  visualization: ContextVisualization;
  compact?: boolean;
}

export const ContextVisualizer: React.FC<ContextVisualizerProps> = ({ 
  visualization, 
  compact = false 
}) => {
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium">Implementation Progress</div>
        {visualization.phases.map((phase) => (
          <div key={phase.phase} className="flex items-center space-x-2">
            <span className="text-xs w-16">Phase {phase.phase}</span>
            <Progress value={phase.completion} className="flex-1 h-2" />
            <span className="text-xs w-8">{phase.completion.toFixed(0)}%</span>
          </div>
        ))}
        
        <div className="text-sm font-medium mt-3">Capabilities</div>
        <div className="flex flex-wrap gap-1">
          {visualization.capabilities.flatMap(cat => cat.items).slice(0, 6).map((item, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {item}
            </Badge>
          ))}
          {visualization.capabilities.flatMap(cat => cat.items).length > 6 && (
            <Badge variant="outline" className="text-xs">
              +{visualization.capabilities.flatMap(cat => cat.items).length - 6} more
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Implementation Phases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {visualization.phases.map((phase) => (
              <div key={phase.phase} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Phase {phase.phase}</span>
                  <span className="text-sm text-gray-600">{phase.completion.toFixed(0)}%</span>
                </div>
                <Progress value={phase.completion} />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{phase.features.length} features</span>
                  <span>{phase.blockers.length} blockers</span>
                </div>
                {phase.features.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {phase.features.slice(0, 3).map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {phase.features.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{phase.features.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {visualization.capabilities.map((category) => (
              <div key={category.category}>
                <h4 className="font-medium text-sm mb-2 text-gray-700">
                  {category.category}
                </h4>
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
          <CardTitle className="text-lg">AI Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visualization.suggestions
              .sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
              })
              .map((suggestion, index) => (
                <div key={index} className="border rounded p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <Badge 
                      variant={
                        suggestion.priority === 'high' ? 'destructive' :
                        suggestion.priority === 'medium' ? 'default' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {suggestion.priority.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {suggestion.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{suggestion.text}</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
