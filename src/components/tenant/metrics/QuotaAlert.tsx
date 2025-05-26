
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface QuotaAlertProps {
  quotaPercentage: number;
}

export function QuotaAlert({ quotaPercentage }: QuotaAlertProps) {
  if (quotaPercentage <= 80) return null;

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-800">Quota Warning</p>
            <p className="text-sm text-yellow-700">
              You've used {quotaPercentage.toFixed(1)}% of your quota. 
              Consider upgrading or optimizing usage.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
