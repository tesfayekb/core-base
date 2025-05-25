
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TenantSwitcher } from './TenantSwitcher';
import { TenantContextIndicator } from './TenantContextIndicator';
import { Button } from '@/components/ui/button';
import { AlertCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TenantStatusBarProps {
  className?: string;
  showSwitcher?: boolean;
  variant?: 'minimal' | 'full';
}

export function TenantStatusBar({ 
  className, 
  showSwitcher = true, 
  variant = 'full' 
}: TenantStatusBarProps) {
  const { user, tenantId } = useAuth();

  if (!user) {
    return null;
  }

  if (!tenantId) {
    return (
      <div className={cn(
        'flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg',
        className
      )}>
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">No tenant context active</span>
        </div>
        <Button variant="outline" size="sm">
          Select Tenant
        </Button>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <TenantContextIndicator />
        {showSwitcher && <TenantSwitcher variant="header" />}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center justify-between p-3 bg-muted/50 border rounded-lg',
      className
    )}>
      <div className="flex items-center gap-4">
        <TenantContextIndicator showDetails />
        <div className="text-xs text-muted-foreground">
          Active Session
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {showSwitcher && <TenantSwitcher variant="header" />}
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
