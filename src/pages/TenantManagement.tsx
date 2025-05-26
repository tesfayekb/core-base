
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TenantDashboard } from '@/components/tenant/TenantDashboard';
import { TenantSettings } from '@/components/tenant/TenantSettings';
import { TenantAdministration } from '@/components/tenant/TenantAdministration';
import { TenantCustomization } from '@/components/tenant/TenantCustomization';
import { TenantQuotaManagement } from '@/components/tenant/TenantQuotaManagement';
import { TenantWorkflowManager } from '@/components/tenant/TenantWorkflowManager';
import { withTenantBoundary, withTenantAdmin } from '@/components/tenant/withTenantSecurity';

// Secure components with tenant boundary enforcement
const SecureTenantDashboard = withTenantBoundary(TenantDashboard);
const SecureTenantSettings = withTenantBoundary(TenantSettings);
const SecureTenantCustomization = withTenantBoundary(TenantCustomization);
const SecureTenantQuotaManagement = withTenantBoundary(TenantQuotaManagement);
const SecureTenantWorkflowManager = withTenantBoundary(TenantWorkflowManager);

// Admin-only components
const SecureTenantAdministration = withTenantAdmin(TenantAdministration);

export default function TenantManagement() {
  return (
    <div className="container mx-auto p-6">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="customization">Customization</TabsTrigger>
          <TabsTrigger value="quotas">Quotas</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="administration">Administration</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <SecureTenantDashboard />
        </TabsContent>
        
        <TabsContent value="settings">
          <SecureTenantSettings />
        </TabsContent>
        
        <TabsContent value="customization">
          <SecureTenantCustomization />
        </TabsContent>
        
        <TabsContent value="quotas">
          <SecureTenantQuotaManagement />
        </TabsContent>
        
        <TabsContent value="workflows">
          <SecureTenantWorkflowManager />
        </TabsContent>
        
        <TabsContent value="administration">
          <SecureTenantAdministration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
