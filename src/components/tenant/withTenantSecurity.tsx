
import React from 'react';
import { useTenantSecurity } from '@/hooks/useTenantSecurity';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, AlertTriangle } from 'lucide-react';

interface TenantSecurityProps {
  requiredOperation?: string;
  resourceType?: string;
  resourceId?: string;
  fallbackComponent?: React.ComponentType;
}

export function withTenantSecurity<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  securityConfig: TenantSecurityProps = {}
) {
  return function TenantSecurityWrapper(props: P) {
    const { user, tenantId } = useAuth();
    const { validateTenantAccess, isValidating } = useTenantSecurity();
    const [accessResult, setAccessResult] = React.useState<{ allowed: boolean; reason?: string } | null>(null);

    React.useEffect(() => {
      const checkAccess = async () => {
        if (!user || !tenantId || !securityConfig.requiredOperation) {
          setAccessResult({ allowed: true });
          return;
        }

        const result = await validateTenantAccess(
          tenantId,
          securityConfig.requiredOperation,
          securityConfig.resourceType,
          securityConfig.resourceId
        );

        setAccessResult(result);
      };

      checkAccess();
    }, [user, tenantId, securityConfig.requiredOperation, validateTenantAccess]);

    if (isValidating || !accessResult) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 animate-spin text-blue-500" />
            <p>Validating access...</p>
          </CardContent>
        </Card>
      );
    }

    if (!accessResult.allowed) {
      const FallbackComponent = securityConfig.fallbackComponent;
      
      if (FallbackComponent) {
        return <FallbackComponent />;
      }

      return (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
            <p className="text-red-700">{accessResult.reason || 'You do not have permission to access this resource.'}</p>
          </CardContent>
        </Card>
      );
    }

    return <WrappedComponent {...props} />;
  };
}

// HOC for tenant boundary enforcement
export function withTenantBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return withTenantSecurity(WrappedComponent, {
    requiredOperation: 'read',
    resourceType: 'tenant_data'
  });
}

// HOC for admin operations
export function withTenantAdmin<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return withTenantSecurity(WrappedComponent, {
    requiredOperation: 'admin',
    resourceType: 'tenant_management'
  });
}
