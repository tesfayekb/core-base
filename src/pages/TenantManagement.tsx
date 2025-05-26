
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TenantDashboard } from '@/components/tenant/TenantDashboard';
import { TenantSettings } from '@/components/tenant/TenantSettings';
import { TenantAdministration } from '@/components/tenant/TenantAdministration';
import { TenantCustomization } from '@/components/tenant/TenantCustomization';

export default function TenantManagement() {
  return (
    <div className="container mx-auto p-6">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="administration">Administration</TabsTrigger>
          <TabsTrigger value="customization">Customization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <TenantDashboard />
        </TabsContent>
        
        <TabsContent value="settings">
          <TenantSettings />
        </TabsContent>
        
        <TabsContent value="administration">
          <TenantAdministration />
        </TabsContent>
        
        <TabsContent value="customization">
          <TenantCustomization />
        </TabsContent>
      </Tabs>
    </div>
  );
}
