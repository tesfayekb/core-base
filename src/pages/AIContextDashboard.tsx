
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionBoundary } from "@/components/rbac/PermissionBoundary";
import { Brain, Activity, Shield, Database } from "lucide-react";
import { DetailedImplementationProgress } from "@/components/ai-context/DetailedImplementationProgress";
import { SecurityMonitoring } from "@/components/ai-context/SecurityMonitoring";
import { SystemCapabilities } from "@/components/ai-context/SystemCapabilities";
import { ContextDebugger } from "@/components/ai-context/ContextDebugger";

export default function AIContextDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-8 w-8" />
          AI Context Dashboard
        </h2>
        <p className="text-muted-foreground">Monitor AI context system performance and implementation progress</p>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="debug" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Debug
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PermissionBoundary 
            action="View" 
            resource="ai_context"
            fallback={
              <Card>
                <CardHeader>
                  <CardTitle>Access Restricted</CardTitle>
                  <CardDescription>You don't have permission to view AI context overview</CardDescription>
                </CardHeader>
              </Card>
            }
          >
            <SystemCapabilities />
          </PermissionBoundary>
        </TabsContent>

        <TabsContent value="progress">
          <PermissionBoundary 
            action="View" 
            resource="ai_context"
            fallback={
              <Card>
                <CardHeader>
                  <CardTitle>Access Restricted</CardTitle>
                  <CardDescription>You don't have permission to view implementation progress</CardDescription>
                </CardHeader>
              </Card>
            }
          >
            <DetailedImplementationProgress />
          </PermissionBoundary>
        </TabsContent>

        <TabsContent value="security">
          <PermissionBoundary 
            action="ViewSecurity" 
            resource="ai_context"
            fallback={
              <Card>
                <CardHeader>
                  <CardTitle>Access Restricted</CardTitle>
                  <CardDescription>You don't have permission to view security monitoring</CardDescription>
                </CardHeader>
              </Card>
            }
          >
            <SecurityMonitoring />
          </PermissionBoundary>
        </TabsContent>

        <TabsContent value="debug">
          <PermissionBoundary 
            action="Debug" 
            resource="ai_context"
            fallback={
              <Card>
                <CardHeader>
                  <CardTitle>Access Restricted</CardTitle>
                  <CardDescription>You don't have permission to access debug tools</CardDescription>
                </CardHeader>
              </Card>
            }
          >
            <ContextDebugger />
          </PermissionBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
