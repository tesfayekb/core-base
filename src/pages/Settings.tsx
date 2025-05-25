
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PermissionBoundary } from "@/components/rbac/PermissionBoundary";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your application preferences and configurations</p>
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Basic application preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications for important updates
                </p>
              </div>
              <Switch id="notifications" />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="analytics">Analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Allow analytics data collection
                </p>
              </div>
              <Switch id="analytics" />
            </div>
          </CardContent>
        </Card>
        
        <PermissionBoundary 
          action="Manage" 
          resource="settings"
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>You don't have permission to access system settings</CardDescription>
              </CardHeader>
            </Card>
          }
        >
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Advanced system configuration options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable maintenance mode for system updates
                  </p>
                </div>
                <Switch id="maintenance" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="debug">Debug Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable debug logging for troubleshooting
                  </p>
                </div>
                <Switch id="debug" />
              </div>
              
              <div className="pt-4">
                <Button variant="outline">Export System Logs</Button>
              </div>
            </CardContent>
          </Card>
        </PermissionBoundary>
        
        <PermissionBoundary 
          action="Manage" 
          resource="tenants"
          fallback={null}
        >
          <Card>
            <CardHeader>
              <CardTitle>Tenant Management</CardTitle>
              <CardDescription>Manage tenant-specific settings and configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">Manage Tenants</Button>
            </CardContent>
          </Card>
        </PermissionBoundary>
      </div>
    </div>
  );
}
