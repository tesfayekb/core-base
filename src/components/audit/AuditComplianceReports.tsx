
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { realTimeAuditMonitor } from '@/services/audit/RealTimeAuditMonitor';

interface AuditComplianceReportsProps {
  tenantId: string | null;
}

export function AuditComplianceReports({ tenantId }: AuditComplianceReportsProps) {
  const handleGenerateReport = async (reportType: 'daily' | 'weekly' | 'monthly') => {
    if (!tenantId) return;
    
    const report = await realTimeAuditMonitor.generateComplianceReport(tenantId, reportType);
    
    // Create downloadable report
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${reportType}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-4">
          <Button 
            variant="outline" 
            onClick={() => handleGenerateReport('daily')}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Daily Report</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleGenerateReport('weekly')}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Weekly Report</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleGenerateReport('monthly')}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Monthly Report</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
