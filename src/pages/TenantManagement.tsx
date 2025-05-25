
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenantBoundary } from "@/components/integration/TenantBoundary";
import { TenantRBACConfiguration } from "@/components/tenant/TenantRBACConfiguration";
import { TenantPerformanceDashboard } from "@/components/tenant/TenantPerformanceDashboard";
import { Settings, Activity, Shield, Building2 } from "lucide-react";

export default function TenantManagement() {
  return (
    <TenantBoundary>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage tenant configuration, RBAC settings, and monitor performance
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="rbac" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              RBAC Configuration
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    RBAC Configuration
                  </CardTitle>
                  <CardDescription>
                    Manage roles, permissions, and access control
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Configure tenant-specific role templates and custom permission sets for fine-grained access control.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Performance Monitoring
                  </CardTitle>
                  <CardDescription>
                    Monitor resource usage and system performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Track cache performance, permission resolution times, and resource utilization in real-time.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Tenant Settings
                  </CardTitle>
                  <CardDescription>
                    Configure tenant-specific settings and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Customize tenant behavior, quotas, and integration settings for optimal operation.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rbac">
            <TenantRBACConfiguration />
          </TabsContent>

          <TabsContent value="performance">
            <TenantPerformanceDashboard />
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Settings</CardTitle>
                <CardDescription>
                  Configure tenant-specific settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Tenant settings configuration interface coming soon...</p>
                  <p className="text-sm">This will include quota management, integration settings, and customization options.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TenantBoundary>
  );
}
