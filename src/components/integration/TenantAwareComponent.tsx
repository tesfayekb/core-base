
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface TenantAwareComponentProps {
  children: React.ReactNode;
  className?: string;
  tenantSpecificProps?: Record<string, any>;
}

export function TenantAwareComponent({
  children,
  className,
  tenantSpecificProps = {}
}: TenantAwareComponentProps) {
  const { tenant, tenantId } = useAuth();

  // Apply tenant-specific styling or configuration
  const tenantClassName = cn(
    className,
    tenant?.settings?.theme && `theme-${tenant.settings.theme}`,
    tenantId && `tenant-${tenantId.slice(0, 8)}`
  );

  // Merge tenant-specific props
  const enhancedProps = {
    ...tenantSpecificProps,
    ...(tenant?.settings?.componentProps || {})
  };

  return (
    <div className={tenantClassName} {...enhancedProps}>
      {children}
    </div>
  );
}

// Hook for tenant-aware styling
export function useTenantStyling() {
  const { tenant, tenantId } = useAuth();

  const getTenantClassName = (baseClassName?: string) => {
    return cn(
      baseClassName,
      tenant?.settings?.theme && `theme-${tenant.settings.theme}`,
      tenantId && `tenant-scoped`
    );
  };

  const getTenantStyles = () => {
    return {
      '--tenant-primary': tenant?.settings?.primaryColor || '#0f172a',
      '--tenant-secondary': tenant?.settings?.secondaryColor || '#64748b',
      '--tenant-accent': tenant?.settings?.accentColor || '#3b82f6'
    } as React.CSSProperties;
  };

  return {
    tenant,
    tenantId,
    getTenantClassName,
    getTenantStyles,
    tenantConfig: tenant?.settings || {}
  };
}
