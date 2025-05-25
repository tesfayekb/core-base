
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { tenantContextService } from '@/services/SharedTenantContextService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
}

interface TenantSwitcherProps {
  variant?: 'header' | 'sidebar' | 'standalone';
  className?: string;
}

export function TenantSwitcher({ variant = 'header', className }: TenantSwitcherProps) {
  const { user, tenantId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockTenants: Tenant[] = [
      { id: 'tenant-1', name: 'Acme Corporation', slug: 'acme-corp', status: 'active' },
      { id: 'tenant-2', name: 'Beta Industries', slug: 'beta-ind', status: 'active' },
      { id: 'tenant-3', name: 'Gamma Solutions', slug: 'gamma-sol', status: 'active' }
    ];
    
    setAvailableTenants(mockTenants);
    if (tenantId) {
      const current = mockTenants.find(t => t.id === tenantId);
      setCurrentTenant(current || null);
    }
  }, [tenantId]);

  const handleTenantSwitch = async (targetTenantId: string) => {
    if (!user || targetTenantId === tenantId || isLoading) return;

    setIsLoading(true);
    try {
      const result = await tenantContextService.switchTenantContext(user.id, targetTenantId);
      
      if (result.success) {
        const newTenant = availableTenants.find(t => t.id === targetTenantId);
        setCurrentTenant(newTenant || null);
        
        // Reload the page to refresh all tenant-specific data
        window.location.reload();
      } else {
        console.error('Failed to switch tenant:', result.error);
      }
    } catch (error) {
      console.error('Tenant switch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || availableTenants.length === 0) {
    return null;
  }

  const TriggerContent = () => (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4" />
      <span className="font-medium">
        {currentTenant?.name || 'Select Tenant'}
      </span>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )}
    </div>
  );

  if (variant === 'standalone') {
    return (
      <Card className={cn('w-full max-w-md', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Switch Tenant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {availableTenants.map((tenant) => (
            <Button
              key={tenant.id}
              variant={tenant.id === tenantId ? 'default' : 'outline'}
              className="w-full justify-between"
              onClick={() => handleTenantSwitch(tenant.id)}
              disabled={isLoading}
            >
              <span>{tenant.name}</span>
              {tenant.id === tenantId && <Check className="h-4 w-4" />}
            </Button>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant === 'header' ? 'ghost' : 'outline'} 
          className={cn(
            'justify-between min-w-[200px]',
            variant === 'sidebar' && 'w-full',
            className
          )}
          disabled={isLoading}
        >
          <TriggerContent />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Available Tenants</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {availableTenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => handleTenantSwitch(tenant.id)}
            className="flex items-center justify-between cursor-pointer"
            disabled={isLoading}
          >
            <div className="flex flex-col">
              <span className="font-medium">{tenant.name}</span>
              <span className="text-xs text-muted-foreground">{tenant.slug}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                {tenant.status}
              </Badge>
              {tenant.id === tenantId && <Check className="h-4 w-4" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
