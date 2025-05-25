
import React from 'react';
import { useEntityBoundaryPermission } from '../../hooks/useEntityBoundaryPermission';
import { Alert, AlertDescription } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { Shield, AlertTriangle } from 'lucide-react';

interface EntityBoundaryGuardProps {
  action: string;
  resource: string;
  resourceId?: string;
  targetEntityId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showEntityViolation?: boolean;
}

/**
 * Entity Boundary Guard component that enforces entity boundaries in UI
 */
export function EntityBoundaryGuard({
  action,
  resource,
  resourceId,
  targetEntityId,
  children,
  fallback,
  showEntityViolation = true
}: EntityBoundaryGuardProps) {
  const { 
    hasPermission, 
    isLoading, 
    error, 
    entityId,
    canCrossEntities 
  } = useEntityBoundaryPermission(action, resource, resourceId, targetEntityId);
  
  if (isLoading) {
    return <Skeleton className="h-8 w-full" />;
  }
  
  if (error) {
    if (showEntityViolation) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Entity boundary error: {error}
          </AlertDescription>
        </Alert>
      );
    }
    return <>{fallback}</>;
  }
  
  if (!hasPermission) {
    if (showEntityViolation) {
      return (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Access denied. This operation is not permitted within your entity boundaries.
            {entityId && ` Current entity: ${entityId}`}
            {canCrossEntities && " You may need to switch entity context."}
          </AlertDescription>
        </Alert>
      );
    }
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

/**
 * Higher-order component for entity boundary protection
 */
export function withEntityBoundary<T extends object>(
  Component: React.ComponentType<T>,
  action: string,
  resource: string,
  resourceId?: string,
  targetEntityId?: string
) {
  return function EntityBoundaryProtectedComponent(props: T) {
    return (
      <EntityBoundaryGuard 
        action={action} 
        resource={resource} 
        resourceId={resourceId}
        targetEntityId={targetEntityId}
      >
        <Component {...props} />
      </EntityBoundaryGuard>
    );
  };
}

/**
 * Entity context switcher component
 */
interface EntityContextSwitcherProps {
  onEntityChange?: (entityId: string) => void;
  currentEntityId?: string;
}

export function EntityContextSwitcher({ 
  onEntityChange, 
  currentEntityId 
}: EntityContextSwitcherProps) {
  const [availableEntities, setAvailableEntities] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    // This would fetch available entities for the user
    // Implementation depends on your auth context and entity service
    setIsLoading(false);
  }, []);
  
  if (isLoading) {
    return <Skeleton className="h-8 w-48" />;
  }
  
  return (
    <div className="flex items-center space-x-2">
      <Shield className="h-4 w-4 text-muted-foreground" />
      <select
        value={currentEntityId || ''}
        onChange={(e) => onEntityChange?.(e.target.value)}
        className="px-3 py-1 border rounded-md text-sm"
      >
        {availableEntities.map((entity) => (
          <option key={entity.id} value={entity.id}>
            {entity.name}
          </option>
        ))}
      </select>
    </div>
  );
}
