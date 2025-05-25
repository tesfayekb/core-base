
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Building2, Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TenantContextIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function TenantContextIndicator({ 
  className, 
  showDetails = false 
}: TenantContextIndicatorProps) {
  const { user, tenantId } = useAuth();

  if (!user || !tenantId) {
    return (
      <Badge variant="destructive" className={cn('flex items-center gap-1', className)}>
        <Shield className="h-3 w-3" />
        No Tenant Context
      </Badge>
    );
  }

  const tenantName = 'Current Tenant'; // Replace with actual tenant name lookup

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge variant="default" className="flex items-center gap-1">
        <Building2 className="h-3 w-3" />
        {showDetails ? tenantName : 'Tenant Active'}
      </Badge>
      
      {showDetails && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{user.email}</span>
        </div>
      )}
    </div>
  );
}
