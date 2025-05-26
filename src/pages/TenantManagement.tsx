
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TenantDashboard } from '@/components/tenant/TenantDashboard';
import { TenantAdministration } from '@/components/tenant/TenantAdministration';
import { AuditDashboard } from '@/components/audit/AuditDashboard';

export default function TenantManagement() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="administration">Administration</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-6">
          <TenantDashboard />
        </TabsContent>
        
        <TabsContent value="administration" className="space-y-6">
          <TenantAdministration />
        </TabsContent>
        
        <TabsContent value="audit" className="space-y-6">
          <AuditDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
