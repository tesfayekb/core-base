
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from './ErrorBoundary';
import { TenantBoundary } from './TenantBoundary';
import { PermissionButton } from './PermissionButton';
import { PermissionSection } from './PermissionSection';
import { TenantAwareComponent, useTenantStyling } from './TenantAwareComponent';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Building2, User, Settings, Trash2 } from 'lucide-react';

// Component that throws an error for testing
function ErrorThrowingComponent() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('This is a test error thrown by the component');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Error Testing Component
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Click the button below to trigger an error and test the error boundary.
        </p>
        <Button 
          variant="destructive" 
          onClick={() => setShouldThrow(true)}
        >
          Throw Error
        </Button>
      </CardContent>
    </Card>
  );
}

function TenantAwareDemo() {
  const { getTenantClassName, getTenantStyles, tenantConfig } = useTenantStyling();

  return (
    <TenantAwareComponent>
      <Card className={getTenantClassName("border-2")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Tenant-Aware Component
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div style={getTenantStyles()}>
            <p className="text-sm text-muted-foreground">
              This component adapts its styling and behavior based on the current tenant context.
            </p>
            <div className="mt-2 space-y-2">
              <Badge variant="outline">Tenant Styling Applied</Badge>
              {Object.keys(tenantConfig).length > 0 && (
                <Badge variant="secondary">
                  {Object.keys(tenantConfig).length} Config Options
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TenantAwareComponent>
  );
}

export default function IntegrationShowcase() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Integration Components</h1>
        <p className="text-muted-foreground">
          Phase 1.6 Integration Components - Permission boundaries, tenant awareness, and error handling
        </p>
      </div>

      {/* Error Boundary Demo */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Error Boundary</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ErrorBoundary showDetails>
            <ErrorThrowingComponent />
          </ErrorBoundary>
          
          <Card>
            <CardHeader>
              <CardTitle>Error Boundary Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Catches React component errors</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Provides user-friendly error messages</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Logs errors to monitoring service</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Offers retry and reload options</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Tenant Boundary Demo */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Tenant Boundary</h2>
        <TenantBoundary>
          <TenantAwareDemo />
        </TenantBoundary>
      </section>

      {/* Permission-Based Rendering */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Permission-Based Rendering</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Permission Buttons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Buttons that only appear if user has the required permission:
                </p>
                <div className="flex gap-2">
                  <PermissionButton action="View" resource="users">
                    <User className="h-4 w-4 mr-2" />
                    View Users
                  </PermissionButton>
                  
                  <PermissionButton action="Update" resource="settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Settings
                  </PermissionButton>
                  
                  <PermissionButton 
                    action="Delete" 
                    resource="users" 
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </PermissionButton>
                </div>
              </div>
            </CardContent>
          </Card>

          <PermissionSection
            action="ViewAny"
            resource="reports"
            title="Protected Section"
            description="This section requires ViewAny permission for reports"
          >
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm">
                  🎉 You have permission to view this protected content!
                </p>
              </CardContent>
            </Card>
          </PermissionSection>
        </div>
      </section>

      {/* Integration Patterns */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Integration Patterns</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Error Boundaries</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Component-level error catching</p>
              <p>• Graceful error recovery</p>
              <p>• Error logging and monitoring</p>
              <p>• User-friendly fallback UI</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Permission System</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Conditional component rendering</p>
              <p>• Permission-aware buttons</p>
              <p>• Protected sections and pages</p>
              <p>• Fine-grained access control</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tenant Awareness</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Tenant-scoped styling</p>
              <p>• Context-aware components</p>
              <p>• Multi-tenant data isolation</p>
              <p>• Tenant-specific configuration</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
