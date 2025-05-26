
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ResourceUsageCardProps {
  resourceUsage: { storage: number; api: number; bandwidth: number };
}

export function ResourceUsageCard({ resourceUsage }: ResourceUsageCardProps) {
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Usage Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Storage</span>
            <div className="flex items-center gap-2">
              <Progress value={resourceUsage.storage} className="w-32 h-2" />
              <Badge className={getUsageColor(resourceUsage.storage)}>
                {resourceUsage.storage}%
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">API Calls</span>
            <div className="flex items-center gap-2">
              <Progress value={resourceUsage.api} className="w-32 h-2" />
              <Badge className={getUsageColor(resourceUsage.api)}>
                {resourceUsage.api}%
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Bandwidth</span>
            <div className="flex items-center gap-2">
              <Progress value={resourceUsage.bandwidth} className="w-32 h-2" />
              <Badge className={getUsageColor(resourceUsage.bandwidth)}>
                {resourceUsage.bandwidth}%
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
